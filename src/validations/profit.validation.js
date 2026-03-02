const Joi = require("joi");

const profitQuerySchema = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  nurseryId: Joi.string().hex().length(24).optional()
});

module.exports = {
  profitQuerySchema
};
