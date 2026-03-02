const Joi = require("joi");
const INDIAN_MOBILE_PATTERN = /^(?:\+91|91)?[6-9]\d{9}$/;

const createCustomerSchema = Joi.object({
  name: Joi.string().required(),

  mobileNumber: Joi.string()
    .pattern(INDIAN_MOBILE_PATTERN)
    .required(),

  address: Joi.string().optional()
});

const updateCustomerSchema = Joi.object({
  name: Joi.string().optional(),
  mobileNumber: Joi.string()
    .pattern(INDIAN_MOBILE_PATTERN)
    .optional(),
  address: Joi.string().allow("", null).optional()
}).min(1);

module.exports = {
  createCustomerSchema,
  updateCustomerSchema
};
