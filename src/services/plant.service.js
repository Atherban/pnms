const Plant = require("../models/Plant.model");
const ApiError = require("../exceptions/ApiError");


// Create a new plant
const createPlant = async (data) => {
  const plant = await Plant.create(data);
  return plant;
};


// Get all plants
const getAllPlants = async () => {
  return Plant.find();
};

// Get plant by ID
const getPlantById = async (plantId) =>{
  const plant = await Plant.findById(plantId);
  if (!plant) {
    throw new ApiError(404, "Plant not found");
  }
  return plant;
}

// Delete plant by ID
const deletePlantById = async(plantId) =>{
  const plant = await Plant.findByIdAndDelete(plantId)
  if(!plant){
    throw new ApiError(404, "Plant not Found")
  }
  return plant;
}

// Update plant details
const updatePlantDetails = async (plantId, updateData) => {
  const allowedFields = ["name", "price", "category"];
  const safeUpdate = {};

  for (const key of allowedFields) {
    if (updateData[key] !== undefined) {
      safeUpdate[key] = updateData[key];
    }
  }

  const plant = await Plant.findByIdAndUpdate(
    plantId,
    safeUpdate,
    { new: true, runValidators: true }
  );

  if (!plant) {
    throw new ApiError(404, "Plant not found");
  }

  return plant;
};


// Update plant stock safely
const updatePlantQuantity = async (plantId, quantityChange) => {
  const plant = await Plant.findById(plantId);

  if (!plant) {
    throw new ApiError(404, "Plant not found");
  }

  const newQuantity = plant.quantityAvailable + quantityChange;

  if (newQuantity < 0) {
    throw new ApiError(400, "Insufficient plant stock");
  }

  plant.quantityAvailable = newQuantity;
  plant.status = newQuantity === 0 ? "OUT_OF_STOCK" : "AVAILABLE";

  await plant.save();
  return plant;
};

// Mark plant as out of stock
const markOutOfStock = async (plantId) => {
  const plant = await Plant.findById(plantId);

  if (!plant) {
    throw new ApiError(404, "Plant not found");
  }

  plant.status = "OUT_OF_STOCK";
  plant.quantityAvailable = 0;

  await plant.save();
  return plant;
};

module.exports = {
  createPlant,
  getAllPlants,
  getPlantById,
  deletePlantById,
  updatePlantDetails,
  updatePlantQuantity,
  markOutOfStock
};
