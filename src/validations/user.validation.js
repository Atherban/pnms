const Joi = require("joi");

const createUserSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid("ADMIN", "STAFF", "VIEWER").required()
});

const updateUserSchema = Joi.object({
  name: Joi.string().optional(),
  role: Joi.string().valid("ADMIN", "STAFF", "VIEWER").optional(),
  isActive: Joi.boolean().optional()
}).min(1);

module.exports = {
  createUserSchema,
  updateUserSchema
};
