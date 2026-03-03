const Joi = require("joi");

const exportReportSchema = Joi.object({
  nurseryId: Joi.string().hex().length(24).optional(),
  reportType: Joi.string()
    .valid(
      "SALES",
      "PAYMENT_DUES",
      "INVENTORY",
      "STAFF_ACCOUNTING",
      "EXPENSES",
      "PROFITABILITY"
    )
    .required(),
  format: Joi.string().valid("PDF", "XLSX").required(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional()
});

const analyticsQuerySchema = Joi.object({
  nurseryId: Joi.string().hex().length(24).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  reportType: Joi.string()
    .valid(
      "SALES",
      "PAYMENT_DUES",
      "INVENTORY",
      "STAFF_ACCOUNTING",
      "EXPENSES",
      "PROFITABILITY"
    )
    .optional(),
  staffId: Joi.string().hex().length(24).optional(),
  plantTypeId: Joi.string().hex().length(24).optional(),
  customerId: Joi.string().hex().length(24).optional()
});

module.exports = {
  exportReportSchema,
  analyticsQuerySchema
};
