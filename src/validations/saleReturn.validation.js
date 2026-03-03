const Joi = require("joi");

const returnItemSchema = Joi.object({
  saleItemId: Joi.string().hex().length(24).required(),
  quantityReturned: Joi.number().integer().min(1).required(),
  inventoryAction: Joi.string().valid("RESTOCK", "SCRAP").default("RESTOCK")
});

const createSaleReturnSchema = Joi.object({
  items: Joi.array().items(returnItemSchema).min(1).required(),
  reason: Joi.string().trim().max(500).required()
});

const returnIdParamSchema = Joi.object({
  returnId: Joi.string().hex().length(24).required()
});

const saleReturnListQuerySchema = Joi.object({
  saleId: Joi.string().hex().length(24).optional(),
  status: Joi.string().valid("REQUESTED", "APPROVED", "REJECTED", "COMPLETED").optional()
});

const rejectSaleReturnSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(500).required()
});

module.exports = {
  createSaleReturnSchema,
  returnIdParamSchema,
  saleReturnListQuerySchema,
  rejectSaleReturnSchema
};
