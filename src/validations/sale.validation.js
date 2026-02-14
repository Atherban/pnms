const Joi = require("joi");

const createSaleSchema = Joi.object({
  customer: Joi.string().hex().length(24).optional(),

  items: Joi.array()
    .items(
      Joi.object({
        inventoryId: Joi.string().hex().length(24).required(),
        quantity: Joi.number().integer().min(1).required()
      })
    )
    .min(1)
    .required(),

  paymentMode: Joi.string()
    .valid("CASH", "UPI", "ONLINE")
    .required()
});

module.exports = {
  createSaleSchema
};
