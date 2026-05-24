/**
 * Run: node scripts/test-smtp.js
 * Verifies Gmail SMTP credentials without sending mail.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { verifySmtpConnection, isEmailConfigured } = require('../services/emailService');

async function main() {
  if (!isEmailConfigured()) {
    console.error('FAIL: Set SMTP_HOST, SMTP_EMAIL, and SMTP_PASSWORD in backend/.env');
    process.exit(1);
  }

  console.log('Testing SMTP connection...');
  const result = await verifySmtpConnection();

  if (result.ok) {
    console.log('SUCCESS: SMTP is configured correctly.');
    process.exit(0);
  }

  console.error('FAIL:', result.error);
  console.error('\nGmail checklist:');
  console.error('  1. Enable 2-Step Verification on your Google account');
  console.error('  2. Create an App Password: https://myaccount.google.com/apppasswords');
  console.error('  3. Use the 16-character app password in SMTP_PASSWORD (no spaces)');
  console.error('  4. SMTP_EMAIL must match the Gmail account that owns the app password');
  process.exit(1);
}

main();
