const nodemailer = require('nodemailer');
const { buildPasswordResetEmail } = require('../templates/passwordResetEmail');
const { RESET_EXPIRY_MINUTES } = require('../utils/passwordReset');

let transporter = null;
let lastVerifyError = null;

const getSmtpCredentials = () => {
  const email = (process.env.SMTP_EMAIL || '').trim();
  const password = (process.env.SMTP_PASSWORD || '').trim().replace(/\s+/g, '');
  return { email, password };
};

const isEmailConfigured = () => {
  const { email, password } = getSmtpCredentials();
  return Boolean(process.env.SMTP_HOST && email && password);
};

const createTransporter = () => {
  const { email, password } = getSmtpCredentials();
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const useGmailService =
    process.env.SMTP_SERVICE === 'gmail' ||
    (process.env.SMTP_HOST || '').includes('gmail');

  if (useGmailService && process.env.SMTP_SERVICE !== 'custom') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: email, pass: password },
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user: email, pass: password },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
};

const getTransporter = () => {
  if (!isEmailConfigured()) return null;
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

const resetTransporter = () => {
  transporter = null;
  lastVerifyError = null;
};

const getFromAddress = () => {
  const name = process.env.SMTP_FROM_NAME || 'RASTROmenu';
  const { email } = getSmtpCredentials();
  return `"${name}" <${email}>`;
};

const verifySmtpConnection = async () => {
  if (!isEmailConfigured()) {
    lastVerifyError = 'SMTP_HOST, SMTP_EMAIL, or SMTP_PASSWORD is missing in .env';
    return { ok: false, error: lastVerifyError };
  }

  const { password } = getSmtpCredentials();
  if (password.length < 16 && (process.env.SMTP_HOST || '').includes('gmail')) {
    console.warn(
      '[emailService] Gmail App Passwords are usually 16 characters. Check SMTP_PASSWORD in .env.'
    );
  }

  try {
    const transport = getTransporter();
    await transport.verify();
    lastVerifyError = null;
    return { ok: true };
  } catch (err) {
    lastVerifyError = err.message;
    resetTransporter();
    return { ok: false, error: err.message };
  }
};

const sendMail = async ({ to, subject, html, text }) => {
  if (!isEmailConfigured()) {
    console.warn('[emailService] SMTP not configured — email not sent.');
    return { sent: false, reason: 'SMTP_NOT_CONFIGURED' };
  }

  try {
    const transport = getTransporter();
    const info = await transport.sendMail({
      from: getFromAddress(),
      to,
      subject,
      html,
      text,
    });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error('[emailService] Send failed:', err.message);
    resetTransporter();
    return { sent: false, reason: 'SEND_FAILED', error: err.message };
  }
};

const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const template = buildPasswordResetEmail({
    name,
    resetUrl,
    expiryMinutes: RESET_EXPIRY_MINUTES,
  });

  return sendMail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
};

module.exports = {
  isEmailConfigured,
  verifySmtpConnection,
  getLastSmtpError: () => lastVerifyError,
  resetTransporter,
  sendMail,
  sendPasswordResetEmail,
};
