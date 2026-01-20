const Joi = require("joi");

const createPlantSchema = Joi.object({
  name: Joi.string().trim().required(),

  category: Joi.string()
    .valid("FLOWER", "FRUIT", "INDOOR", "OUTDOOR")
    .required(),

  price: Joi.number().min(0).required(),

  quantityAvailable: Joi.number().integer().min(0).required()
});

module.exports = {
  createPlantSchema
};
