const Joi = require('joi');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

const createCategory = {
  body: Joi.object().keys({
    name: Joi.string().trim().required(),
    description: Joi.string().trim().allow(null, ''),
  }),
};

const updateCategory = {
  params: Joi.object().keys({
    id: objectId.required(),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().trim(),
      description: Joi.string().trim().allow(null, ''),
    })
    .min(1),
};

const categoryId = {
  params: Joi.object().keys({
    id: objectId.required(),
  }),
};

const assignCategories = {
  body: Joi.object().keys({
    categoryIds: Joi.array().items(objectId).min(1).required(),
  }),
};

module.exports = {
  assignCategories,
  categoryId,
  createCategory,
  updateCategory,
};
