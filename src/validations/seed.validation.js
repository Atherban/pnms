const Joi = require("joi");

const createSeedSchema = Joi.object({
  name: Joi.string().trim().required(),

  category: Joi.string().required(),

  supplierName: Joi.string().required(),

  totalPurchased: Joi.number().integer().min(1).required(),

  purchaseDate: Joi.date().required(),

  expiryDate: Joi.date().greater(Joi.ref("purchaseDate")).required()
});

module.exports = {
  createSeedSchema
};
