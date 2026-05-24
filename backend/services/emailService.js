const nodemailer = require('nodemailer');
const { buildPasswordResetEmail } = require('../templates/passwordResetEmail');
const { RESET_EXPIRY_MINUTES } = require('../utils/passwordReset');

let transporter = null;

const isEmailConfigured = () =>
  Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_EMAIL &&
    process.env.SMTP_PASSWORD
  );

const getTransporter = () => {
  if (transporter) return transporter;
  if (!isEmailConfigured()) return null;

  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });
  return transporter;
};

const getFromAddress = () => {
  const name = process.env.SMTP_FROM_NAME || 'RASTROmenu';
  const email = process.env.SMTP_EMAIL || 'noreply@rastromenu.com';
  return `"${name}" <${email}>`;
};

/**
 * Modular send — swap transport (Resend, SendGrid, etc.) behind this function later.
 */
const sendMail = async ({ to, subject, html, text }) => {
  const transport = getTransporter();
  if (!transport) {
    console.warn('[emailService] SMTP not configured. Email not sent.');
    return { sent: false, reason: 'SMTP_NOT_CONFIGURED' };
  }

  const info = await transport.sendMail({
    from: getFromAddress(),
    to,
    subject,
    html,
    text,
  });

  return { sent: true, messageId: info.messageId };
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
  sendMail,
  sendPasswordResetEmail,
};
