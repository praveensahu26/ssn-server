const Joi = require('joi');

const getStats = {
  query: Joi.object().keys({
    from: Joi.date().iso(),
    to: Joi.date().iso().min(Joi.ref('from')),
  }),
};

module.exports = {
  getStats,
};
