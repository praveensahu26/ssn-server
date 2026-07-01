const Joi = require('joi');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

const listReporters = {
  query: Joi.object().keys({
    status: Joi.string().valid('pending', 'approved', 'rejected').default('pending'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

const reporterId = {
  params: Joi.object().keys({
    id: objectId.required(),
  }),
};

const rejectReporter = {
  params: Joi.object().keys({
    id: objectId.required(),
  }),
  body: Joi.object().keys({
    reason: Joi.string().trim().required(),
  }),
};

module.exports = { listReporters, rejectReporter, reporterId };
