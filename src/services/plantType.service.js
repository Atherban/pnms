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

const getPlantTypesById = async (id) => {
  return PlantType.findById(id)
}

const updatePlantType = async (id, data, user) => {
  const allowedUpdates = {
    ...(data.name && { name: data.name }),
    ...(data.category && { category: data.category }),
    ...(data.variety && { variety: data.variety }),
    ...(data.lifecycleDays !== undefined && {
      lifecycleDays: data.lifecycleDays
    }),
    ...(data.sellingPrice !== undefined && {
      sellingPrice: data.sellingPrice
    }),
    updatedBy: user.userId
  };

  const updatedPlantType = await PlantType.findOneAndUpdate(
    { _id: id },
    { $set: allowedUpdates },
    { new: true, runValidators: true }
  );

  if (!updatedPlantType) {
    throw new ApiError(404, "Plant type not found");
  }

  return updatedPlantType;
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
  updatePlantType,
  attachPlantTypeImage,
  getPlantTypesById
};
