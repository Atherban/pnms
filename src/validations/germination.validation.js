const Joi = require("joi");

const germinationSchema = Joi.object({
  sowingId: Joi.string().hex().length(24).required(),

  germinatedSeeds: Joi.number().integer().min(0).required(),

  discardedSeeds: Joi.number().integer().min(0).default(0),

  germinationDate: Joi.date().optional()
}).custom((value, helpers) => {
  const germinated = Number(value.germinatedSeeds || 0);
  const discarded = Number(value.discardedSeeds || 0);
  if (germinated + discarded <= 0) {
    return helpers.message("At least one seed must be marked germinated or discarded");
  }
  return value;
});

module.exports = {
  germinationSchema
};
