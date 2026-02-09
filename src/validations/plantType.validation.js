const Joi = require("joi");

const createPlantTypeSchema = Joi.object({
  name: Joi.string().trim().required(),

  category: Joi.string().trim().required(),

  variety: Joi.string().trim().optional(),

  lifecycleDays: Joi.number().integer().positive().optional(),

  sellingPrice: Joi.number()
    .positive()
    .precision(2)
    .required()
});

module.exports = {
  createPlantTypeSchema
};
