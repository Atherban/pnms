const Plant = require("../models/Plant.model");
const ApiError = require("../exceptions/ApiError");

const attachPlantImage = async (plantId, file) => {
  const plant = await Plant.findById(plantId);
  if (!plant) {
    throw new ApiError(404, "Plant not found");
  }

  plant.images.push({
    fileName: file.filename
  });

  await plant.save();
  return plant;
};

module.exports = {
  attachPlantImage
};
