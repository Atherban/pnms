const mongoose = require("mongoose");
const Seed = require("../models/Seed.model");
const SowingBatch = require("../models/SowingBatch.model");
const PlantInventory = require("../models/PlantInventory.model");
const ApiError = require("../exceptions/ApiError");

const sowSeeds = async (data, user) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const seed = await Seed.findById(data.seedId)
      .populate("plantType")
      .session(session);

    if (!seed) {
      throw new ApiError(404, "Seed not found");
    }

    if (seed.totalPurchased - seed.seedsUsed < data.quantity) {
      throw new ApiError(400, "Insufficient seed stock");
    }

    seed.seedsUsed += data.quantity;
    await seed.save({ session });

    const sowingBatch = await SowingBatch.create(
      [
        {
          seed: seed._id,
          plantType: seed.plantType._id,
          quantitySown: data.quantity,
          performedBy: user.userId,
          roleAtTime: user.role
        }
      ],
      { session }
    );

    await PlantInventory.create(
      [
        {
          plantType: seed.plantType._id,
          source: "SOWN",
          sourceRef: sowingBatch[0]._id,
          quantity: data.quantity
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return sowingBatch[0];
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

const getSowings = async () => {
  return SowingBatch.find()
    .populate("seed")
    .populate("plantType")
    .sort({ createdAt: -1 });
};

module.exports = {
  sowSeeds,
  getSowings
};

