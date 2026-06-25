const Joi = require('joi');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);
const tagsField = Joi.alternatives().try(Joi.array().items(Joi.string().trim()), Joi.string().trim());

const createCampaign = {
  body: Joi.object().keys({
    caption: Joi.string().trim().required(),
    description: Joi.string().trim().allow(null, ''),
    category: objectId.required(),
    tags: tagsField,
    goalAmount: Joi.number().positive().required(),
    endDate: Joi.date().iso().greater('now').required(),
    location: Joi.string().trim().allow(null, ''),
  }),
};

const listCampaigns = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    scope: Joi.string().valid('discover', 'mine').default('discover'),
    category: objectId,
    status: Joi.string().valid('pending', 'active', 'rejected', 'completed', 'suspended'),
  }),
};

const campaignId = {
  params: Joi.object().keys({
    id: objectId.required(),
  }),
};

const donate = {
  params: Joi.object().keys({
    id: objectId.required(),
  }),
  body: Joi.object().keys({
    amount: Joi.number().positive().required(),
    message: Joi.string().trim().max(500).allow(null, ''),
    paymentMethod: Joi.string().valid('card', 'google_pay', 'paypal').required(),
  }),
};

const listSupportFeed = {
  params: Joi.object().keys({
    id: objectId.required(),
  }),
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

module.exports = {
  campaignId,
  createCampaign,
  donate,
  listCampaigns,
  listSupportFeed,
};
