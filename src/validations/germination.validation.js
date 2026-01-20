const Joi = require("joi");

const germinationSchema = Joi.object({
  sowingId: Joi.string().hex().length(24).required(),

  germinatedSeeds: Joi.number().integer().min(0).required(),

  germinationDate: Joi.date().required()
});

module.exports = {
  germinationSchema
};
