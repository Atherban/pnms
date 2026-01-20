const Joi = require("joi");

const labourSchema = Joi.object({
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

module.exports = {
  labourSchema
};
