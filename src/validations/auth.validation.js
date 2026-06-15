const Joi = require('joi');

const password = Joi.string().min(8).required();

const login = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

const forgotPassword = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
  }),
};

const sendOtp = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
  }),
};

const verifyOtp = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
    otp: Joi.string()
      .pattern(/^\d{6}$/)
      .required(),
    type: Joi.string().valid('email-verification', 'reset-password').required(),
  }),
};

const resetPassword = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
    password,
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'confirmPassword must match password',
    }),
  }),
};

module.exports = {
  forgotPassword,
  login,
  resetPassword,
  sendOtp,
  verifyOtp,
};
