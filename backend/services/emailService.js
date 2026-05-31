const { Resend } = require('resend');
const { buildPasswordResetEmail } = require('../templates/passwordResetEmail');
const { RESET_EXPIRY_MINUTES } = require('../utils/passwordReset');

let resend = null;

const getResendClient = () => {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const client = getResendClient();
  
  if (!client) {
    console.error('[emailService] Cannot send email: RESEND_API_KEY is not configured.');
    return { sent: false, reason: 'MISSING_API_KEY', error: 'RESEND_API_KEY is missing' };
  }

  const template = buildPasswordResetEmail({
    name,
    resetUrl,
    expiryMinutes: RESET_EXPIRY_MINUTES,
  });

  try {
    const { data, error } = await client.emails.send({
      from: 'RASTROmenu <onboarding@resend.dev>',
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (error) {
      console.error('[emailService] Resend API Error:', error);
      return { sent: false, reason: 'RESEND_API_ERROR', error: error.message };
    }

    return { sent: true, messageId: data.id };
  } catch (err) {
    console.error('[emailService] Send failed:', err.message);
    return { sent: false, reason: 'SEND_FAILED', error: err.message };
  }
};

module.exports = {
  sendPasswordResetEmail,
};
