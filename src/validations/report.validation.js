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

module.exports = {
  exportReportSchema
};
