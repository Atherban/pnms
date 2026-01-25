const Joi = require("joi");

const createPlantSchema = Joi.object({
  name: Joi.string().trim().required(),
  category: Joi.string().valid("FLOWER", "FRUIT", "INDOOR", "OUTDOOR").required(),
  price: Joi.number().min(0).required(),
  quantityAvailable: Joi.number().integer().min(0).required()
});

const updatePlantSchema = Joi.object({
  name: Joi.string().optional(),
  price: Joi.number().optional(),
  category: Joi.string().optional()
});

const updateQuantitySchema = Joi.object({
  quantityChange: Joi.number().integer().required()
});

module.exports = {
  createPlantSchema,
  updatePlantSchema,
  updateQuantitySchema
};
