const Joi = require("joi");
const PlantTypeModel = require("../models/PlantType.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");

const createPlantTypeSchema = Joi.object({
  name: Joi.string().trim().required(),

  category: Joi.string().trim().required(),

  variety: Joi.string().trim().required(),

  lifecycleDays: Joi.number().integer().positive().required(),

  sellingPrice: Joi.number()
    .positive()
    .precision(2)
    .required()
});

const updatePlantTypeSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).external(
    async (val) => {
      const exists = await PlantTypeModel.exists({name: val})
      if(exists) throw new ApiError(statusCode.CONFLICT, `${val} Already Exsists`)
    }
  ),

  category: Joi.string().trim().uppercase(),

  variety: Joi.string().trim().allow("", null),

  lifecycleDays: Joi.number()
    .integer()
    .positive(),

  sellingPrice: Joi.number()
    .positive()
    .precision(2)
})
.min(1); 


module.exports = {
  createPlantTypeSchema,
  updatePlantTypeSchema
};
