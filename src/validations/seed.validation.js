const Joi = require("joi");

const createSeedSchema = Joi.object({
  name: Joi.string().required(),
  category: Joi.string()
    .valid("VEGETABLE", "FLOWER", "FRUIT", "HERB")
    .required(),
  supplierName: Joi.string().required(),
  totalPurchased: Joi.number().integer().min(1).required(),
  purchaseDate: Joi.date().required(),
  expiryDate: Joi.date().greater(Joi.ref("purchaseDate")).required()
});

const updateSeedSchema = Joi.object({
  name: Joi.string().optional(),
  supplierName: Joi.string().optional(),
  expiryDate: Joi.date().optional()
}).min(1);

module.exports = {
  createSeedSchema,
  updateSeedSchema
};
