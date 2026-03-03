const Joi = require("joi");

const sowingSchema = Joi.object({
  seedId: Joi.string()
    .hex()
    .length(24)
    .optional(),

  customerSeedBatchId: Joi.string()
    .hex()
    .length(24)
    .optional(),

  customerId: Joi.string()
    .hex()
    .length(24)
    .optional(),

  quantity: Joi.number()
    .integer()
    .min(1)
    .required(),

  sowingDate: Joi.date().optional(),

  expectedYield: Joi.number().integer().min(0).optional()
}).custom((value, helpers) => {
  if (!value.seedId && !value.customerSeedBatchId) {
    return helpers.message("Either seedId or customerSeedBatchId is required");
  }
  if (value.seedId && value.customerSeedBatchId) {
    return helpers.message("Provide only one of seedId or customerSeedBatchId");
  }
  return value;
});

module.exports = {
  sowingSchema
};
