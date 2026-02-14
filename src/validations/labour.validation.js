const Joi = require("joi");

const createLabourSchema = Joi.object({
  name: Joi.string().required(),

  workType: Joi.string()
    .valid(
      "SEED_SOWING",
      "WATERING",
      "POTTING",
      "WEEDING",
      "FERTILIZING",
      "PACKING",
      "LOADING"
    )
    .required(),

  hoursWorked: Joi.number().min(0).optional(),

  wagePerHour: Joi.number().min(0).optional(),

  wagePerDay: Joi.number().min(0).optional(),

  date: Joi.date().required()
});

const updateLabourSchema = Joi.object({
  name: Joi.string(),
  workType: Joi.string().valid(
    "SEED_SOWING",
    "WATERING",
    "POTTING",
    "WEEDING",
    "FERTILIZING",
    "PACKING",
    "LOADING"
  ),
  hoursWorked: Joi.number().min(0),
  wagePerHour: Joi.number().min(0),
  wagePerDay: Joi.number().min(0),
  date: Joi.date()
}).min(1);

module.exports = {
  createLabourSchema,
  updateLabourSchema
};
