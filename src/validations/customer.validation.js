const Joi = require("joi");

const customerSchema = Joi.object({
  name: Joi.string().required(),

  mobileNumber: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required(),

  address: Joi.string().optional()
});

module.exports = {
  customerSchema
};
