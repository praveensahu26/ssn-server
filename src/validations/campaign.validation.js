const Joi = require('joi');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);
const tagsField = Joi.alternatives().try(Joi.array().items(Joi.string().trim()), Joi.string().trim());

// form-data can't send real arrays, so a single field also accepts a JSON-stringified array of ids
const parseJsonIdArray = (value, helpers) => {
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch (e) {
    return helpers.error('any.invalid');
  }
  if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id))) {
    return helpers.error('any.invalid');
  }
  return parsed;
};

const categoriesField = Joi.alternatives().try(
  Joi.array().items(objectId).min(1),
  objectId,
  Joi.string().custom(parseJsonIdArray),
);

const createCampaign = {
  body: Joi.object().keys({
    caption: Joi.string().trim().required(),
    description: Joi.string().trim().allow(null, ''),
    categories: categoriesField.required(),
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
    categories: categoriesField,
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

const editCampaign = {
  params: Joi.object().keys({ id: objectId.required() }),
  body: Joi.object()
    .keys({
      caption: Joi.string().trim(),
      description: Joi.string().trim().allow(null, ''),
      categories: categoriesField,
      tags: tagsField,
      goalAmount: Joi.number().positive(),
      endDate: Joi.date().iso().greater('now'),
      location: Joi.string().trim().allow(null, ''),
    })
    .min(1),
};

const reportCampaign = {
  params: Joi.object().keys({ id: objectId.required() }),
  body: Joi.object().keys({
    reason: Joi.string().required(),
    description: Joi.string().trim().max(500).allow(null, ''),
  }),
};

module.exports = {
  campaignId,
  createCampaign,
  donate,
  editCampaign,
  listCampaigns,
  listSupportFeed,
  reportCampaign,
};
