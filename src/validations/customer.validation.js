const Joi = require("joi");

const createCustomerSchema = Joi.object({
  name: Joi.string().required(),

  mobileNumber: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required(),

  address: Joi.string().optional()
});

const updateCustomerSchema = Joi.object({
  name: Joi.string().optional(),
  mobileNumber: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .optional(),
  address: Joi.string().allow("", null).optional()
}).min(1);

module.exports = {
  createCustomerSchema,
  updateCustomerSchema
};
