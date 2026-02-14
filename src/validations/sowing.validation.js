const Joi = require("joi");

const sowingSchema = Joi.object({
  seedId: Joi.string()
    .hex()
    .length(24)
    .required(),

  quantity: Joi.number()
    .integer()
    .min(1)
    .required(),

  sowingDate: Joi.date().optional(),

  expectedYield: Joi.number().integer().min(0).optional()
});

module.exports = {
  sowingSchema
};
