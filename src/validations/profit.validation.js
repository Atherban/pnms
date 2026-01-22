const Joi = require("joi");

const profitQuerySchema = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().required()
});

module.exports = {
  profitQuerySchema
};
