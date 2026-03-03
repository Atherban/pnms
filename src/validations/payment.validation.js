const Joi = require("joi");

const createPaymentSchema = Joi.object({
  saleId: Joi.string().hex().length(24).required(),
  amount: Joi.number().positive().precision(2).required(),
  mode: Joi.string().valid("CASH", "UPI", "ONLINE", "BANK_TRANSFER", "BANK").required(),
  utrNumber: Joi.string().trim().max(120).allow("", null).optional(),
  transactionRef: Joi.string().trim().max(120).allow("", null).optional(),
  paymentProofFileName: Joi.string().trim().allow("", null).optional(),
  paymentAt: Joi.date().optional(),
  autoVerify: Joi.boolean().optional()
}).custom((value, helpers) => {
  if (value.mode !== "CASH" && !value.utrNumber) {
    return helpers.message("utrNumber is required for UPI, ONLINE and BANK/BANK_TRANSFER payments");
  }
  return value;
});

const verifyPaymentSchema = Joi.object({
  action: Joi.string().valid("ACCEPT", "REJECT").required(),
  rejectionReason: Joi.string().trim().max(400).when("action", {
    is: "REJECT",
    then: Joi.required(),
    otherwise: Joi.optional()
  })
});

module.exports = {
  createPaymentSchema,
  verifyPaymentSchema
};
