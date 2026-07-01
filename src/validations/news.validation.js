const Joi = require('joi');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

const createNews = {
  body: Joi.object().keys({
    caption: Joi.string().trim().required(),
    description: Joi.string().trim().allow(null, ''),
    categories: Joi.array().items(objectId).single().min(1).required(),
    location: Joi.string().trim(),
  }),
};

const listNews = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    category: objectId,
    author: objectId,
    status: Joi.string().valid('public', 'flagged', 'deleted'),
    dateFrom: Joi.date().iso(),
    dateTo: Joi.date().iso(),
  }),
};

const listNewsByCategory = {
  params: Joi.object().keys({
    categoryId: objectId.required(),
  }),
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('public', 'flagged', 'deleted'),
  }),
};

const newsId = {
  params: Joi.object().keys({
    id: objectId.required(),
  }),
};

const commentId = {
  params: Joi.object().keys({
    commentId: objectId.required(),
  }),
};

const addComment = {
  params: Joi.object().keys({
    id: objectId.required(),
  }),
  body: Joi.object().keys({
    text: Joi.string().trim().required(),
  }),
};

const listComments = {
  params: Joi.object().keys({
    id: objectId.required(),
  }),
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

const listReactions = {
  params: Joi.object().keys({
    id: objectId.required(),
  }),
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    type: Joi.string().valid('like', 'dislike'),
  }),
};

const addReply = {
  params: Joi.object().keys({
    id: objectId.required(),
    commentId: objectId.required(),
  }),
  body: Joi.object().keys({
    text: Joi.string().trim().required(),
  }),
};

const listReplies = {
  params: Joi.object().keys({
    id: objectId.required(),
    commentId: objectId.required(),
  }),
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

module.exports = {
  addComment,
  addReply,
  commentId,
  createNews,
  listComments,
  listNews,
  listNewsByCategory,
  listReactions,
  listReplies,
  newsId,
};
