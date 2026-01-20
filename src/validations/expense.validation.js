const Joi = require("joi");

const expenseSchema = Joi.object({
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

  amount: Joi.number().min(0).required(),

  date: Joi.date().required()
});

module.exports = {
  expenseSchema
};
