const Joi = require("joi");

const createSeedSchema = Joi.object({
  name: Joi.string().trim().required(),
  plantType: Joi.string()
    .hex()
    .length(24)
    .required(),

  supplierName: Joi.string().trim().required(),

  totalPurchased: Joi.number()
    .integer()
    .min(1)
    .required(),

  quantityUnit: Joi.string().valid("SEEDS", "GRAM", "KG", "UNITS").optional(),

  purchaseDate: Joi.date().required(),

  expiryDate: Joi.date()
    .greater(Joi.ref("purchaseDate"))
    .required()
});

const updateSeedSchema = Joi.object({
  name: Joi.string().trim().optional(),
  supplierName: Joi.string().trim().optional(),
  expiryDate: Joi.date().optional(),
  quantityUnit: Joi.string().valid("SEEDS", "GRAM", "KG", "UNITS").optional()
}).min(1);

module.exports = {
  createSeedSchema,
  updateSeedSchema
};
