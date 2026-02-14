const mongoose = require("mongoose");
const Germination = require("../models/Germination.model");
const SowingBatch = require("../models/SowingBatch.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");
const {
  createInventoryFromGermination
} = require("./inventory.service");

const GERMINATION_POPULATION = [
  {
    path: "sowingId",
    populate: [
      { path: "seed", select: "name supplierName expiryDate" },
      { path: "plantType", select: "name category variety sellingPrice" },
      { path: "performedBy", select: "name email role" }
    ]
  },
  {
    path: "inventoryBatch",
    populate: [
      { path: "plantType", select: "name category variety sellingPrice" },
      { path: "sourceRef" }
    ]
  },
  { path: "performedBy", select: "name email role" }
];

const recordGermination = async (data, user) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sowing = await SowingBatch.findById(data.sowingId).session(session);

    if (!sowing) {
      throw new ApiError(statusCode.NOT_FOUND, "Sowing record not found");
    }

    const availableForGermination =
      sowing.quantitySown - (sowing.quantityGerminated || 0);
    if (data.germinatedSeeds > availableForGermination) {
      throw new ApiError(
        statusCode.BAD_REQUEST,
        "Germinated seeds exceed remaining seeds in sowing batch"
      );
    }

    // Germination is the conversion point where usable seedlings become inventory.
    const [germination] = await Germination.create(
      [
        {
          sowingId: sowing._id,
          germinatedSeeds: data.germinatedSeeds,
          discardedSeeds: data.discardedSeeds || 0,
          germinationDate: data.germinationDate || new Date(),
          performedBy: user.userId,
          roleAtTime: user.role
        }
      ],
      { session }
    );

    sowing.quantityGerminated += data.germinatedSeeds;
    await sowing.save({ session });

    const inventory = await createInventoryFromGermination(
      {
        plantType: sowing.plantType,
        quantity: data.germinatedSeeds,
        receivedAt: data.germinationDate || new Date()
      },
      germination._id,
      session
    );

    germination.inventoryBatch = inventory._id;
    await germination.save({ session });

    await session.commitTransaction();
    session.endSession();

    return Germination.findById(germination._id).populate(GERMINATION_POPULATION);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

const getGerminations = async () => {
  return Germination.find()
    .sort({ createdAt: -1 })
    .populate(GERMINATION_POPULATION);
};

module.exports = {
  recordGermination,
  getGerminations
};
