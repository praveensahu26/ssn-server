const Joi = require('joi');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);
const role = Joi.string().valid('user', 'reporter').default('user');
const pagination = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};

const listAccounts = {
  query: Joi.object().keys({
    role,
    tab: Joi.string()
      .valid('overview', 'all', 'active', 'inactive', 'reported', 'blocked', 'suspended', 'verification')
      .default('all'),
    search: Joi.string().trim().allow(''),
    ...pagination,
  }),
};

const accountStats = {
  query: Joi.object().keys({
    role,
  }),
};

const accountId = {
  params: Joi.object().keys({
    id: objectId.required(),
  }),
};

const paginatedAccountId = {
  params: Joi.object().keys({
    id: objectId.required(),
  }),
  query: Joi.object().keys(pagination),
};

const listPosts = {
  params: Joi.object().keys({
    id: objectId.required(),
  }),
  query: Joi.object().keys({
    status: Joi.string().valid('public', 'flagged', 'deleted'),
    ...pagination,
  }),
};

const listCampaigns = {
  params: Joi.object().keys({
    id: objectId.required(),
  }),
  query: Joi.object().keys({
    status: Joi.string().valid('pending', 'active', 'rejected', 'completed', 'suspended'),
    ...pagination,
  }),
};

const moderationAction = {
  params: Joi.object().keys({
    id: objectId.required(),
  }),
  body: Joi.object().keys({
    reasons: Joi.array().items(Joi.string().trim()).default([]),
    description: Joi.string().trim().allow(''),
    notifyUser: Joi.boolean().default(true),
    duration: Joi.string().trim().allow(null, ''),
  }),
};

module.exports = {
  accountId,
  accountStats,
  listAccounts,
  listCampaigns,
  listPosts,
  moderationAction,
  paginatedAccountId,
};
