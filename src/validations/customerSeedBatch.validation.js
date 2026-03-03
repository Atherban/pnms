const Joi = require("joi");

const createCustomerSeedBatchSchema = Joi.object({
  customerId: Joi.string().hex().length(24).required(),
  plantTypeId: Joi.string().hex().length(24).required(),
  seedQuantity: Joi.number().integer().min(1).required(),
  expectedReadyDate: Joi.date().optional(),
  serviceChargeEstimate: Joi.number().min(0).precision(2).default(0),
  discountAmount: Joi.number().min(0).precision(2).default(0),
  finalAmount: Joi.number().min(0).precision(2).optional(),
  notes: Joi.string().trim().max(1000).allow("", null).optional()
});

const updateCustomerSeedBatchSchema = Joi.object({
  seedQuantity: Joi.number().integer().min(1).optional(),
  expectedReadyDate: Joi.date().optional(),
  serviceChargeEstimate: Joi.number().min(0).precision(2).optional(),
  discountAmount: Joi.number().min(0).precision(2).optional(),
  finalAmount: Joi.number().min(0).precision(2).optional(),
  status: Joi.string()
    .valid("RECEIVED", "SOWN", "GERMINATING", "READY", "COLLECTED", "CLOSED", "DISCARDED")
    .optional(),
  notes: Joi.string().trim().max(1000).allow("", null).optional()
});

module.exports = {
  createCustomerSeedBatchSchema,
  updateCustomerSeedBatchSchema
};
