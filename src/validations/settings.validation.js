const Joi = require('joi');

const updateProfile = {
  body: Joi.object()
    .keys({
      name: Joi.string().trim(),
      bio: Joi.string().trim().allow(null, ''),
      gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say'),
      avatar: Joi.string().uri().allow(null, ''),
      coverPhoto: Joi.string().uri().allow(null, ''),
      liveCaption: Joi.string().trim().allow(null, ''),
      liveUrl: Joi.string().uri().allow(null, ''),
      location: Joi.string().trim().allow(null, ''),
      mobile: Joi.string()
        .pattern(/^[0-9]{7,15}$/)
        .messages({ 'string.pattern.base': 'mobile must be 7 to 15 digits' }),
    })
    .min(1),
};

const changePassword = {
  body: Joi.object().keys({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
      'any.only': 'confirmPassword must match newPassword',
    }),
  }),
};

const deleteAccount = {
  params: Joi.object().keys({
    userId: Joi.string().required(),
  }),
  body: Joi.object().keys({
    reason: Joi.string().required(),
  }),
};

const updatePrivacy = {
  body: Joi.object()
    .keys({
      profileVisibility: Joi.string().valid('everyone', 'connections_only', 'private'),
      whoCanComment: Joi.string().valid('public', 'connections_only', 'private'),
      commentsEnabled: Joi.boolean(),
      whoCanSharePosts: Joi.string().valid('public', 'connections_only', 'private'),
    })
    .min(1),
};

const updatePreferences = {
  body: Joi.object()
    .keys({
      language: Joi.string().trim(),
    })
    .min(1),
};

const blockUser = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
};

const unblockUser = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
};

module.exports = {
  blockUser,
  changePassword,
  deleteAccount,
  unblockUser,
  updatePreferences,
  updatePrivacy,
  updateProfile,
};
