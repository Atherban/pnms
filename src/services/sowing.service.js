const mongoose = require("mongoose");
const Sowing = require("../models/SeedSowing.model");
const Seed = require("../models/Seed.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");

// SOW SEEDS (Transactional)
const sowSeeds = async (data, user) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const seed = await Seed.findById(data.seedId).session(session);

    if (!seed || seed.isDeleted) {
      throw new ApiError(statusCode.NOT_FOUND, "Seed not found");
    }

    if (seed.expiryDate < new Date()) {
      throw new ApiError(statusCode.BAD_REQUEST, "Seed batch has expired");
    }

    const available = seed.totalPurchased - seed.seedsUsed;

    if (data.quantity > available) {
      throw new ApiError(
        statusCode.BAD_REQUEST,
        "Insufficient seed stock"
      );
    }

    // Consume seeds
    seed.seedsUsed += data.quantity;
    await seed.save({ session });

    // Create sowing record
    const [sowing] = await Sowing.create(
      [
        {
          seedId: seed._id,
          plantId: data.plantId,
          quantity: data.quantity,
          sowingDate: data.sowingDate || new Date(),
          performedBy: user.userId,
          roleAtTime: user.role
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return sowing;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// GET ALL SOWINGS (ADMIN only – usually)
const getSowings = async () => {
  return Sowing.find()
    .sort({ createdAt: -1 })
    .populate("seedId", "name")
    .populate("plantId", "name")
    .populate("performedBy", "name email");
};

module.exports = {
  sowSeeds,
  getSowings
};
