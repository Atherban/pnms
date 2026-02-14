const Joi = require("joi");

const germinationSchema = Joi.object({
  sowingId: Joi.string().hex().length(24).required(),

  germinatedSeeds: Joi.number().integer().min(0).required(),

  discardedSeeds: Joi.number().integer().min(0).default(0),

  germinationDate: Joi.date().optional()
});

module.exports = {
  germinationSchema
};
