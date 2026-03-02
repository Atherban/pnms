const Joi = require("joi");

const createExpenseSchema = Joi.object({
  type: Joi.string()
    .valid(
      "SEED",
      "FERTILIZER",
      "POT",
      "SOIL",
      "WATER",
      "ELECTRICITY",
      "TRANSPORT",
      "TOOLS",
      "OTHER"
    )
    .required(),

  description: Joi.string().optional(),
  purpose: Joi.string().optional(),
  productDetails: Joi.string().optional(),

  amount: Joi.number().min(0).required(),

  date: Joi.date().required()
});

const updateExpenseSchema = Joi.object({
  type: Joi.string().valid(
    "SEED",
    "FERTILIZER",
    "POT",
    "SOIL",
    "WATER",
    "ELECTRICITY",
    "TRANSPORT",
    "TOOLS",
    "OTHER"
  ),
  description: Joi.string().allow("", null),
  purpose: Joi.string().allow("", null),
  productDetails: Joi.string().allow("", null),
  amount: Joi.number().min(0),
  date: Joi.date()
}).min(1);

module.exports = {
  createExpenseSchema,
  updateExpenseSchema
};
