const Seed = require("../models/Seed.model");
const ApiError = require("../exceptions/ApiError");

// Create seed
const createSeed = async (data) => {
  return Seed.create(data);
};

// Get all seeds
const getAllSeeds = async () => {
  return Seed.find({ isDeleted: false });
};

// Get seed by ID
const getSeedById = async (seedId) => {
  const seed = await Seed.findOne({
    _id: seedId,
    isDeleted: false
  });

  if (!seed) {
    throw new ApiError(404, "Seed not found");
  }

  return seed;
};

// Update seed (safe fields only)
const updateSeedById = async (seedId, data) => {
  const allowedFields = ["name", "supplierName", "expiryDate"];
  const updateData = {};

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }

  const seed = await Seed.findByIdAndUpdate(
    seedId,
    updateData,
    { new: true, runValidators: true }
  );

  if (!seed || seed.isDeleted) {
    throw new ApiError(404, "Seed not found");
  }

  return seed;
};

// Soft delete seed
const deleteSeedById = async (seedId) => {
  const seed = await Seed.findByIdAndUpdate(
    seedId,
    { isDeleted: true },
    { new: true }
  );

  if (!seed) {
    throw new ApiError(404, "Seed not found");
  }

  return seed;
};

// Attach image to seed
const attachSeedImage = async (seedId, file) => {
  const seed = await Seed.findById(seedId);

  if (!seed || seed.isDeleted) {
    throw new ApiError(404, "Seed not found");
  }

  seed.images.push({
    fileName: file.filename
  });

  await seed.save();
  return seed;
};

// Use seeds (domain logic)
const useSeeds = async (seedId, quantity) => {
  const seed = await Seed.findById(seedId);

  if (!seed || seed.isDeleted) {
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
