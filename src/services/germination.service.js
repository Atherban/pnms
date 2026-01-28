const Germination = require("../models/Germination.model");
const Sowing = require("../models/SeedSowing.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");

// RECORD GERMINATION (Immutable Event)
const recordGermination = async (data, user) => {
  const sowing = await Sowing.findById(data.sowingId);

  if (!sowing) {
    throw new ApiError(statusCode.NOT_FOUND, "Sowing record not found");
  }

  if (data.germinatedSeeds > sowing.quantity) {
    throw new ApiError(
      statusCode.BAD_REQUEST,
      "Germinated seeds exceed seeds sown"
    );
  }

  const germination = await Germination.create({
    sowingId: sowing._id,
    germinatedSeeds: data.germinatedSeeds,
    germinationDate: data.germinationDate || new Date(),
    performedBy: user.userId,
    roleAtTime: user.role
  });

  return germination;
};

// GET ALL GERMINATION RECORDS (ADMIN)
const getGerminations = async () => {
  return Germination.find()
    .sort({ createdAt: -1 })
    .populate({
      path: "sowingId",
      populate: [
        { path: "seedId", select: "name" },
        { path: "plantId", select: "name" }
      ]
    })
    .populate("performedBy", "name email");
};

module.exports = {
  recordGermination,
  getGerminations
};
