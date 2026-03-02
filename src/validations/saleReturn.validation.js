const Joi = require("joi");

const createSaleReturnSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        saleItemId: Joi.string().hex().length(24).required(),
        quantityReturned: Joi.number().integer().min(1).required(),
        inventoryAction: Joi.string().valid("RESTOCK", "SCRAP").default("RESTOCK")
      })
    )
    .min(1)
    .required(),
  reason: Joi.string().trim().max(500).required()
});

module.exports = {
  createSaleReturnSchema
};
