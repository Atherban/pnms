const Joi = require("joi");

const growthStageSchema = Joi.object({
  stage: Joi.string()
    .valid("SEED", "SOWN", "GERMINATED", "HARDENED", "READY_FOR_SALE")
    .required(),
  dayFrom: Joi.number().integer().min(0).required(),
  dayTo: Joi.number().integer().min(0).required()
}).custom((value, helpers) => {
  if (value.dayTo < value.dayFrom) {
    return helpers.error("any.invalid");
  }
  return value;
}, "growth stage day range validation");

const createPlantTypeSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  category: Joi.string()
    .trim()
    .uppercase()
    .valid("VEGETABLE", "FLOWER", "FRUIT", "HERB")
    .required(),
  variety: Joi.string().trim().allow("", null),
  lifecycleDays: Joi.number().integer().positive().required(),
  sellingPrice: Joi.number().positive().precision(2).required(),
  minStockLevel: Joi.number().integer().min(0).default(0),
  defaultCostPrice: Joi.number().min(0).precision(2).default(0),
  growthStages: Joi.array().items(growthStageSchema).default([])
});

const updatePlantTypeSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  category: Joi.string()
    .trim()
    .uppercase()
    .valid("VEGETABLE", "FLOWER", "FRUIT", "HERB"),
  variety: Joi.string().trim().allow("", null),
  lifecycleDays: Joi.number().integer().positive(),
  sellingPrice: Joi.number().positive().precision(2),
  minStockLevel: Joi.number().integer().min(0),
  defaultCostPrice: Joi.number().min(0).precision(2),
  growthStages: Joi.array().items(growthStageSchema)
}).min(1);

module.exports = {
  createPlantTypeSchema,
  updatePlantTypeSchema
};
