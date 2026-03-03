const Joi = require("joi");

const createSaleSchema = Joi.object({
  saleKind: Joi.string().valid("PRODUCT", "SERVICE", "SERVICE_SALE").default("PRODUCT"),

  customer: Joi.string().hex().length(24).optional(),
  customerSeedBatchId: Joi.string().hex().length(24).optional(),

  items: Joi.array()
    .items(
      Joi.object({
        inventoryId: Joi.string().hex().length(24).required(),
        quantity: Joi.number().integer().min(1).required()
      })
    )
    .optional(),

  serviceInvoice: Joi.object({
    sowingCharge: Joi.number().min(0).default(0),
    germinationCharge: Joi.number().min(0).default(0),
    labourCharge: Joi.number().min(0).default(0),
    soilCharge: Joi.number().min(0).default(0),
    trayCharge: Joi.number().min(0).default(0),
    maintenanceCharge: Joi.number().min(0).default(0),
    otherCharge: Joi.number().min(0).default(0),
    notes: Joi.string().trim().max(1000).allow("", null).optional()
  }).optional(),

  paymentMode: Joi.string()
    .valid("CASH", "UPI", "ONLINE", "BANK_TRANSFER", "BANK")
    .required(),

  amountPaid: Joi.number().min(0).precision(2).optional(),
  discountAmount: Joi.number().min(0).precision(2).optional(),
  utrNumber: Joi.string().trim().max(120).allow("", null).optional(),
  transactionRef: Joi.string().trim().max(120).optional(),
  paymentProofFileName: Joi.string().trim().optional()
}).custom((value, helpers) => {
  const saleKind = String(value.saleKind || "PRODUCT").toUpperCase();
  if (saleKind === "PRODUCT" && (!Array.isArray(value.items) || value.items.length === 0)) {
    return helpers.message("items are required for PRODUCT sale");
  }
  if (saleKind === "SERVICE" || saleKind === "SERVICE_SALE") {
    if (!value.customer) {
      return helpers.message("customer is required for SERVICE invoice");
    }
    if (!value.serviceInvoice) {
      return helpers.message("serviceInvoice is required for SERVICE invoice");
    }
    const serviceTotal =
      Number(value.serviceInvoice.sowingCharge || 0) +
      Number(value.serviceInvoice.germinationCharge || 0) +
      Number(value.serviceInvoice.labourCharge || 0) +
      Number(value.serviceInvoice.soilCharge || 0) +
      Number(value.serviceInvoice.trayCharge || 0) +
      Number(value.serviceInvoice.maintenanceCharge || 0) +
      Number(value.serviceInvoice.otherCharge || 0);
    if (serviceTotal <= 0) {
      return helpers.message("SERVICE invoice total must be greater than 0");
    }
  }
  const amountPaid = Number(value.amountPaid || 0);
  if (amountPaid > 0 && value.paymentMode !== "CASH" && !value.utrNumber) {
    return helpers.message("utrNumber is required for non-cash payments when amountPaid is greater than 0");
  }
  return value;
});

module.exports = {
  createSaleSchema
};
