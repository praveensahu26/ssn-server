const sgMail = require('@sendgrid/mail');

const config = require('../config/config');
const otpEmailTemplate = require('../templates/otpEmail.template');

if (config.email.sendgridApiKey) {
  sgMail.setApiKey(config.email.sendgridApiKey);
}

const sendEmail = async (to, subject, html) => {
  if (!config.email.sendgridApiKey || !config.email.from) {
    return;
  }

  await sgMail.send({
    to,
    from: config.email.from,
    subject,
    html,
  });
};

const sendVerificationEmail = async (user, otp) => {
  const html = otpEmailTemplate({
    name: user.name,
    otp,
    title: 'Verify your email',
    message: 'Use the following verification code to verify your email address.',
  });

  await sendEmail(user.email, 'Verify your email', html);
};

const sendResetPasswordEmail = async (user, otp) => {
  const html = otpEmailTemplate({
    name: user.name,
    otp,
    title: 'Reset your password',
    message: 'Use the following verification code to reset your password.',
  });

  await sendEmail(user.email, 'Reset your password', html);
};

module.exports = {
  sendResetPasswordEmail,
  sendVerificationEmail,
};
