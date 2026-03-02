const Joi = require("joi");

const createPurchasedInventorySchema = Joi.object({
  plantType: Joi.string().hex().length(24).required(),
  quantity: Joi.number().integer().min(1).required(),
  quantityUnit: Joi.string().valid("SEEDS", "GRAM", "KG", "UNITS").optional(),
  unitCost: Joi.number().min(0).required(),
  purchaseDate: Joi.date().optional(),
  paymentMode: Joi.string().valid("CASH", "UPI", "ONLINE").default("CASH"),
  supplierName: Joi.string().trim().allow("", null),
  note: Joi.string().trim().allow("", null)
});

module.exports = {
  createPurchasedInventorySchema
};
