const nodemailer = require('nodemailer');
const { buildPasswordResetEmail } = require('../templates/passwordResetEmail');
const { RESET_EXPIRY_MINUTES } = require('../utils/passwordReset');

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

transporter.verify(function(error, success) {
  if (error) {
    console.log("SMTP ERROR:", error);
  } else {
    console.log("SMTP SERVER READY");
  }
});

const isEmailConfigured = () => {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
};

const verifySmtpConnection = async () => {
  try {
    await transporter.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const template = buildPasswordResetEmail({
    name,
    resetUrl,
    expiryMinutes: RESET_EXPIRY_MINUTES,
  });

  try {
    const info = await transporter.sendMail({
      from: `RASTROmenu <${process.env.EMAIL_USER}>`,
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error('[emailService] Send failed:', err.message);
    return { sent: false, reason: 'SEND_FAILED', error: err.message };
  }
};

module.exports = {
  isEmailConfigured,
  verifySmtpConnection,
  sendPasswordResetEmail,
};
