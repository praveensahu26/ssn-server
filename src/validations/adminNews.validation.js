const Joi = require('joi');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

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

const newsId = {
  params: Joi.object().keys({
    id: objectId.required(),
  }),
};

module.exports = {
  listNews,
  newsId,
};
