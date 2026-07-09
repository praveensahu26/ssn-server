const Joi = require('joi');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

const pagination = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};

const getUserProfile = {
  params: Joi.object().keys({
    userId: objectId.required(),
  }),
};

const updateProfile = {
  body: Joi.object()
    .keys({
      name: Joi.string().trim(),
      bio: Joi.string().trim().allow(null, ''),
      gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say'),
      dateOfBirth: Joi.date().iso().max('now').allow(null),
      liveCaption: Joi.string().trim().allow(null, ''),
      liveUrl: Joi.string().uri().allow(null, ''),
      location: Joi.string().trim().allow(null, ''),
    })
    .min(1),
};

const listPosts = {
  query: Joi.object().keys(pagination),
};

const userIdPosts = {
  params: Joi.object().keys({
    userId: objectId.required(),
  }),
  query: Joi.object().keys(pagination),
};

const newsId = {
  params: Joi.object().keys({
    newsId: objectId.required(),
  }),
};

const savedPosts = {
  query: Joi.object().keys(pagination),
};

const userIdParam = {
  params: Joi.object().keys({
    userId: objectId.required(),
  }),
};

const followingList = {
  query: Joi.object().keys(pagination),
};

const followersList = {
  query: Joi.object().keys(pagination),
};

const reportProfile = {
  params: Joi.object().keys({
    userId: objectId.required(),
  }),
  body: Joi.object().keys({
    reason: Joi.string().trim().required(),
    description: Joi.string().trim().max(500).allow(null, ''),
  }),
};

module.exports = {
  followersList,
  followingList,
  getUserProfile,
  listPosts,
  newsId,
  reportProfile,
  savedPosts,
  updateProfile,
  userIdParam,
  userIdPosts,
};
