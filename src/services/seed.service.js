const Seed = require("../models/Seed.model");
const PlantType = require("../models/PlantType.model");
const ApiError = require("../exceptions/ApiError");

// Create seed (ADMIN)
const createSeed = async (data, user) => {
  const plantType = await PlantType.findById(data.plantType);

  if (!plantType) {
    throw new ApiError(400, "Invalid plant type");
  }

  return Seed.create({
    ...data,
    createdBy: user.userId
  });
};

// Get all seeds
const getAllSeeds = async () => {
  return Seed.find({ isDeleted: false })
    .populate("plantType");
};

// Get seed by ID
const getSeedById = async (seedId) => {
  const seed = await Seed.findOne({
    _id: seedId,
    isDeleted: false
  }).populate("plantType");

  if (!seed) {
    throw new ApiError(404, "Seed not found");
  }

  return seed;
};

// Update seed (SAFE FIELDS ONLY)
const updateSeedById = async (seedId, data, user) => {
  const seed = await Seed.findOneAndUpdate(
    { _id: seedId, isDeleted: false },
    {
      ...data,
      updatedBy: user.userId
    },
    { new: true, runValidators: true }
  ).populate("plantType");

  if (!seed) {
    throw new ApiError(404, "Seed not found");
  }

  return seed;
};

// Soft delete seed
const deleteSeedById = async (seedId) => {
  const seed = await Seed.findOneAndUpdate(
    { _id: seedId, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );

  if (!seed) {
    throw new ApiError(404, "Seed not found");
  }

  return seed;
};

const attachSeedImage = async (seedId, file) => {
  const seed = await Seed.findOne({
    _id: seedId,
    isDeleted: false
  });

  if (!seed) {
    throw new ApiError(404, "Seed not found");
  }

  seed.images.push({
    fileName: file.filename
  });

  await seed.save();
  return seed;
};

const useSeeds = async (seedId, quantity) => {
  const seed = await Seed.findOne({
    _id: seedId,
    isDeleted: false
  });

  if (!seed) {
    throw new ApiError(404, "Seed not found");
  }

  if (seed.expiryDate < new Date()) {
    throw new ApiError(400, "Seed batch has expired");
  }

  const available = seed.totalPurchased - seed.seedsUsed;

  if (quantity > available) {
    throw new ApiError(400, "Insufficient seed stock");
  }

  seed.seedsUsed += quantity;
  await seed.save();

  return seed;
};

module.exports = {
  createSeed,
  getAllSeeds,
  getSeedById,
  updateSeedById,
  deleteSeedById,
  attachSeedImage,
  useSeeds
};
