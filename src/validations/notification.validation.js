const Joi = require("joi");

const createNotificationSchema = Joi.object({
  title: Joi.string().trim().min(2).max(140).required(),
  message: Joi.string().trim().min(2).max(1000).optional(),
  body: Joi.string().trim().min(2).max(1000).optional(),
  audience: Joi.string()
    .valid("ALL", "CUSTOMER", "STAFF", "NURSERY_ADMIN", "SUPER_ADMIN")
    .required(),
  nurseryId: Joi.string().hex().length(24).optional(),
  customerId: Joi.string().hex().length(24).optional(),
  customerPhone: Joi.string().trim().optional(),
  dueReminderEveryDays: Joi.number().integer().min(1).max(365).optional(),
  productStatusTag: Joi.string()
    .valid(
      "SOWN",
      "GERMINATED",
      "READY",
      "DISCARDED",
      "PAYMENT_PENDING",
      "PAYMENT_VERIFIED",
      "PAYMENT_REJECTED"
    )
    .optional()
}).or("message", "body");

const markReadParamsSchema = Joi.object({
  id: Joi.string().hex().length(24).required()
});

const dueReminderConfigSchema = Joi.object({
  everyDays: Joi.number().integer().min(1).max(365).required()
});

const notificationTestSchema = Joi.object({
  userId: Joi.string().hex().length(24).required()
});

module.exports = {
  createNotificationSchema,
  markReadParamsSchema,
  dueReminderConfigSchema,
  notificationTestSchema
};
