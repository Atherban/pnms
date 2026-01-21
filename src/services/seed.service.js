const Seed = require("../models/Seed.model");
const ApiError = require("../exceptions/ApiError");

// Create new seed batch
const createSeed = async (data) => {
  return Seed.create(data);
};


// Get all seed batches
const getAllSeeds = async () => {
  return Seed.find();
};


// Use seeds from a batch
const useSeeds = async (seedId, quantity) => {
  const seed = await Seed.findById(seedId);

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
  useSeeds
};
