const Germination = require("../models/Germination.model");
const SeedSowing = require("../models/SeedSowing.model");
const ApiError = require("../exceptions/ApiError");

const recordGermination = async (data) => {
  const sowing = await SeedSowing.findById(data.sowingId);

  if (!sowing) {
    throw new ApiError(404, "Sowing record not found");
  }

  if (data.germinatedSeeds > sowing.totalSeedsSown) {
    throw new ApiError(400, "Germinated seeds exceed seeds sown");
  }

  return Germination.create({
    sowing: data.sowingId,
    germinatedSeeds: data.germinatedSeeds,
    germinationDate: data.germinationDate
  });
};

module.exports = {
  recordGermination
};
