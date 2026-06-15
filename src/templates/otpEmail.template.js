const otpEmailTemplate = ({ name, otp, title, message }) => `
  <!doctype html>
  <html>
    <body style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
      <div style="max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="margin: 0 0 16px;">${title}</h2>
        <p>Hello ${name},</p>
        <p>${message}</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px; margin: 24px 0;">${otp}</p>
        <p>This OTP expires in 10 minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    </body>
  </html>
`;

module.exports = otpEmailTemplate;
