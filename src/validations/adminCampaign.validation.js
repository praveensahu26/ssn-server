const Joi = require('joi');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);
const suspensionReasonValues = [
  'Violation of Platform Guidelines',
  'Misleading or False Information',
  'Inappropriate Content',
  'Reported for Fraudulent Activity',
  'Other',
];

const listCampaigns = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    tab: Joi.string().valid('overview', 'active', 'completed', 'requests', 'suspended').default('overview'),
    category: objectId,
    organizer: objectId,
    dateFrom: Joi.date().iso(),
    dateTo: Joi.date().iso(),
  }),
};

const campaignId = {
  params: Joi.object().keys({
    id: objectId.required(),
  }),
};

const rejectCampaign = {
  params: Joi.object().keys({
    id: objectId.required(),
  }),
  body: Joi.object().keys({
    rejectionReason: Joi.string().trim().required(),
  }),
};

const suspendCampaign = {
  params: Joi.object().keys({
    id: objectId.required(),
  }),
  body: Joi.object().keys({
    suspensionReasons: Joi.array()
      .items(Joi.string().valid(...suspensionReasonValues))
      .min(1)
      .required(),
    suspensionNote: Joi.string()
      .trim()
      .allow(null, '')
      .when('suspensionReasons', {
        is: Joi.array().has('Other'),
        then: Joi.string().trim().min(1).required(),
      }),
  }),
};

module.exports = {
  campaignId,
  listCampaigns,
  rejectCampaign,
  suspendCampaign,
};
