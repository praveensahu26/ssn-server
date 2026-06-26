const Joi = require('joi');

const password = Joi.string().min(8).required();

const register = {
  body: Joi.object().keys({
    name: Joi.string().trim().required(),
    mobile: Joi.string()
      .pattern(/^[0-9]{7,15}$/)
      .messages({ 'string.pattern.base': 'mobile must be 7 to 15 digits' }),
    gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say'),
    // Present only when the caller is applying as a reporter.
    journalistId: Joi.string().trim(),
  }),
};

const login = {
  body: Joi.object().keys({
    identifier: Joi.string().required().messages({ 'any.required': 'email or mobile is required' }),
    otp: Joi.string()
      .pattern(/^\d{6}$/)
      .required(),
  }),
};

const googleLogin = {
  body: Joi.object().keys({
    idToken: Joi.string().required(),
  }),
};

const forgotPassword = {
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
  }),
};

const resetPassword = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
    otp: Joi.string()
      .pattern(/^\d{6}$/)
      .required(),
    password,
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'confirmPassword must match password',
    }),
  }),
};

const refreshToken = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const logout = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const applyAsReporter = {
  body: Joi.object().keys({
    documents: Joi.array().items(Joi.string()).min(1).required(),
  }),
};

const updateProfile = {
  body: Joi.object()
    .keys({
      name: Joi.string().trim(),
      avatar: Joi.string().uri(),
      gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say'),
      mobile: Joi.string()
        .pattern(/^[0-9]{7,15}$/)
        .messages({ 'string.pattern.base': 'mobile must be 7 to 15 digits' }),
    })
    .min(1),
};

module.exports = {
  applyAsReporter,
  forgotPassword,
  googleLogin,
  login,
  logout,
  refreshToken,
  register,
  resetPassword,
  updateProfile,
  verifyOtp,
};
