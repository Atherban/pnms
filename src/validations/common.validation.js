const Joi = require("joi");

const objectIdSchema = Joi.object({
  id: Joi.string().hex().length(24).required()
});

module.exports = {
  objectIdSchema
};
