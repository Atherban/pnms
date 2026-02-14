const PlantType = require("../models/PlantType.model");
const PlantInventory = require("../models/PlantInventory.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");

const PLANT_TYPE_POPULATION = {
  path: "updatedBy",
  select: "name email role"
};

const createPlantType = async (data) => {
  const exists = await PlantType.findOne({ name: data.name.trim() });
  if (exists) {
    throw new ApiError(statusCode.CONFLICT, "PlantType already exists");
  }

  const plantType = await PlantType.create(data);
  return PlantType.findById(plantType._id).populate(PLANT_TYPE_POPULATION);
};

const getPlantTypes = async () => {
  return PlantType.find()
    .populate(PLANT_TYPE_POPULATION)
    .sort({ name: 1 });
};

const getPlantTypesById = async (id) => {
  const plantType = await PlantType.findById(id).populate(PLANT_TYPE_POPULATION);
  if (!plantType) {
    throw new ApiError(statusCode.NOT_FOUND, "Plant type not found");
  }
  return plantType;
};

const updatePlantType = async (id, data, user) => {
  if (data.name) {
    const exists = await PlantType.findOne({
      name: data.name.trim(),
      _id: { $ne: id }
    });

    if (exists) {
      throw new ApiError(statusCode.CONFLICT, "PlantType already exists");
    }
  }

  const updatedPlantType = await PlantType.findOneAndUpdate(
    { _id: id },
    {
      $set: {
        ...data,
        updatedBy: user.userId
      }
    },
    { new: true, runValidators: true }
  ).populate(PLANT_TYPE_POPULATION);

  if (!updatedPlantType) {
    throw new ApiError(statusCode.NOT_FOUND, "Plant type not found");
  }

  return updatedPlantType;
};

const attachPlantTypeImage = async (plantTypeId, file) => {
  const plantType = await PlantType.findById(plantTypeId).populate(PLANT_TYPE_POPULATION);

  if (!plantType) {
    throw new ApiError(statusCode.NOT_FOUND, "PlantType not found");
  }

  plantType.images.push({
    fileName: file.filename
  });

  await plantType.save();
  return PlantType.findById(plantType._id).populate(PLANT_TYPE_POPULATION);
};

const deletePlantType = async (id) => {
  const inventoryInUse = await PlantInventory.exists({
    plantType: id,
    quantity: { $gt: 0 }
  });

  if (inventoryInUse) {
    throw new ApiError(
      statusCode.BAD_REQUEST,
      "Cannot delete plant type with active inventory"
    );
  }

  const plantType = await PlantType.findByIdAndDelete(id).populate(PLANT_TYPE_POPULATION);
  if (!plantType) {
    throw new ApiError(statusCode.NOT_FOUND, "Plant type not found");
  }

  return plantType;
};

module.exports = {
  createPlantType,
  getPlantTypes,
  updatePlantType,
  attachPlantTypeImage,
  getPlantTypesById,
  deletePlantType
};
