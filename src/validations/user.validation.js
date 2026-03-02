const Joi = require("joi");
const INDIAN_PHONE_PATTERN = /^(?:\+91|91)?[6-9]\d{9}$/;

const createUserSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().optional(),
  phoneNumber: Joi.string().pattern(INDIAN_PHONE_PATTERN).optional(),
  password: Joi.when("role", {
    is: "CUSTOMER",
    then: Joi.string().min(5).optional(),
    otherwise: Joi.string().min(8).required()
  }),
  role: Joi.string()
    .valid("SUPER_ADMIN", "NURSERY_ADMIN", "STAFF", "CUSTOMER")
    .required(),
  nurseryId: Joi.string().hex().length(24).optional(),
  mustChangePassword: Joi.boolean().optional()
}).or("email", "phoneNumber");

const updateUserSchema = Joi.object({
  name: Joi.string().optional(),
  email: Joi.string().email().optional(),
  phoneNumber: Joi.string().pattern(INDIAN_PHONE_PATTERN).optional(),
  role: Joi.string()
    .valid("SUPER_ADMIN", "NURSERY_ADMIN", "STAFF", "CUSTOMER")
    .optional(),
  isActive: Joi.boolean().optional(),
  mustChangePassword: Joi.boolean().optional(),
  nurseryId: Joi.string().hex().length(24).optional()
}).min(1);

const resetUserPasswordSchema = Joi.object({
  defaultPassword: Joi.string().min(5).max(64).optional()
});

const registerDeviceTokenSchema = Joi.object({
  token: Joi.string().trim().min(10).required(),
  platform: Joi.string().valid("ios", "android", "web", "unknown").optional(),
  appOwnership: Joi.string().trim().max(64).optional(),
  deviceName: Joi.string().trim().max(120).optional()
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  resetUserPasswordSchema,
  registerDeviceTokenSchema
};
