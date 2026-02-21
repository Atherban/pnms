const mongoose = require("mongoose");
const Seed = require("../models/Seed.model");
const SowingBatch = require("../models/SowingBatch.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");

const SOWING_POPULATION = [
  { path: "seed", select: "name supplierName expiryDate totalPurchased seedsUsed images" },
  { path: "plantType", select: "name category variety sellingPrice images" },
  { path: "performedBy", select: "name email role" }
];

const sowSeeds = async (data, user) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const seed = await Seed.findById(data.seedId)
      .populate("plantType")
      .session(session);

    if (!seed) {
      throw new ApiError(statusCode.NOT_FOUND, "Seed not found");
    }

    if (seed.totalPurchased - seed.seedsUsed < data.quantity) {
      throw new ApiError(statusCode.BAD_REQUEST, "Insufficient seed stock");
    }

    seed.seedsUsed += data.quantity;
    await seed.save({ session });

    // Sowing only consumes seeds and records the event.
    // Inventory is intentionally created later at germination stage.
    const sowingBatch = await SowingBatch.create(
      [
        {
          seed: seed._id,
          plantType: seed.plantType._id,
          quantitySown: data.quantity,
          sowingDate: data.sowingDate || new Date(),
          expectedYield: data.expectedYield,
          performedBy: user.userId,
          roleAtTime: user.role
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return SowingBatch.findById(sowingBatch[0]._id).populate(SOWING_POPULATION);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

const getSowings = async () => {
  return SowingBatch.find()
    .populate(SOWING_POPULATION)
    .sort({ createdAt: -1 });
};

module.exports = {
  sowSeeds,
  getSowings
};
