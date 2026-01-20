const Joi = require("joi");

const sowingSchema = Joi.object({
  seedId: Joi.string().hex().length(24).required(),

  totalSeedsSown: Joi.number().integer().min(1).required(),

  sowingDate: Joi.date().required()
});

module.exports = {
  sowingSchema
};
