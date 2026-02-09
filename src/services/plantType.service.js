const PlantType = require("../models/PlantType.model");
const ApiError = require("../exceptions/ApiError");

const createPlantType = async (data) => {
  const exists = await PlantType.findOne({ name: data.name });
  if (exists) {
    throw new ApiError(400, "PlantType already exists");
  }

  return PlantType.create(data);
};

const getPlantTypes = async () => {
  return PlantType.find().sort({ name: 1 });
};

const attachPlantTypeImage = async (plantTypeId, file) => {
  const plantType = await PlantType.findById(plantTypeId);

  if (!plantType) {
    throw new ApiError(404, "PlantType not found");
  }

  plantType.images.push({
    fileName: file.filename
  });

  await plantType.save();
  return plantType;
};

module.exports = {
  createPlantType,
  getPlantTypes,
  attachPlantTypeImage
};
