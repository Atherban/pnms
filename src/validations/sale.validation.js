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
    .valid("CASH", "UPI", "ONLINE", "BANK_TRANSFER")
    .required(),

  amountPaid: Joi.number().min(0).precision(2).optional(),
  discountAmount: Joi.number().min(0).precision(2).optional(),
  utrNumber: Joi.string().trim().max(120).allow("", null).optional(),
  transactionRef: Joi.string().trim().max(120).optional(),
  paymentProofFileName: Joi.string().trim().optional()
}).custom((value, helpers) => {
  const amountPaid = Number(value.amountPaid || 0);
  if (amountPaid > 0 && value.paymentMode !== "CASH" && !value.utrNumber) {
    return helpers.message("utrNumber is required for non-cash payments when amountPaid is greater than 0");
  }
  return value;
});

module.exports = {
  createSaleSchema
};
