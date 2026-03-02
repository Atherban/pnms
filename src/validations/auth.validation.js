const Joi = require("joi");

const INDIAN_PHONE_PATTERN = /^(\+91|91)?[6-9]\d{9}$/;

const loginSchema = Joi.object({
  email: Joi.string().email().optional(),
  phoneNumber: Joi.string().pattern(INDIAN_PHONE_PATTERN).optional(),
  password: Joi.string().min(5).required()
}).or("email", "phoneNumber");

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(5).required(),
  newPassword: Joi.string().min(5).required()
});

module.exports = {
  loginSchema,
  changePasswordSchema
};
