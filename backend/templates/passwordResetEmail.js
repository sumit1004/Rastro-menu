const buildPasswordResetEmail = ({ name, resetUrl, expiryMinutes = 15 }) => {
  const displayName = name ? name.split(' ')[0] : 'there';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#fb923c 0%,#f97316 50%,#ea580c 100%);padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">RASTRO<span style="opacity:0.95;">menu</span></p>
              <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.9);">Secure account recovery</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;">Reset your password</h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#64748b;">
                Hi ${displayName}, we received a request to reset the password for your RASTROmenu account.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                <tr>
                  <td style="border-radius:10px;background:linear-gradient(90deg,#fb923c,#f97316,#ea580c);">
                    <a href="${resetUrl}" target="_blank" rel="noopener noreferrer"
                       style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#64748b;">
                This link expires in <strong style="color:#ea580c;">${expiryMinutes} minutes</strong> and can only be used once.
              </p>
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 16px;margin-bottom:20px;">
                <p style="margin:0;font-size:13px;line-height:1.5;color:#9a3412;">
                  <strong>Security notice:</strong> If you did not request this email, you can safely ignore it. Your password will not change unless you use the link above.
                </p>
              </div>
              <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#94a3b8;">
                Button not working? Copy and paste this URL into your browser:
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#f97316;word-break:break-all;">${resetUrl}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#64748b;">Need help? Contact our support team.</p>
              <p style="margin:0;font-size:11px;color:#94a3b8;">&copy; ${new Date().getFullYear()} RASTROmenu. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `
Reset your RASTROmenu password

Hi ${displayName},

We received a request to reset your password. Open the link below to choose a new password (expires in ${expiryMinutes} minutes):

${resetUrl}

If you did not request this, ignore this email.

— RASTROmenu Support
`.trim();

  return {
    subject: 'Reset your RASTROmenu password',
    html,
    text,
  };
};

module.exports = { buildPasswordResetEmail };
