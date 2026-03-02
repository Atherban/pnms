const mongoose = require("mongoose");
const Seed = require("../models/Seed.model");
const SowingBatch = require("../models/SowingBatch.model");
const Customer = require("../models/Customer.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");
const { createCustomerNotification } = require("./notification.service");
const { normalizeSowingCustomer } = require("../utils/customerIdentity.util");

const SOWING_POPULATION = [
  {
    path: "seed",
    select: "name supplierName expiryDate totalPurchased quantityUnit seedsUsed images"
  },
  {
    path: "plantType",
    select: "name category variety sellingPrice images expectedSeedQtyPerBatch expectedSeedUnit"
  },
  { path: "customerId", select: "name mobileNumber" },
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

    if (user.role !== "SUPER_ADMIN" && user.nurseryId && String(seed.nurseryId) !== String(user.nurseryId)) {
      throw new ApiError(statusCode.FORBIDDEN, "Cannot sow seeds from another nursery");
    }

    if (seed.totalPurchased - seed.seedsUsed < data.quantity) {
      throw new ApiError(statusCode.BAD_REQUEST, "Insufficient seed stock");
    }

    if (data.customerId) {
      const customer = await Customer.findOne({
        _id: data.customerId,
        deletedAt: { $exists: false },
        ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {})
      }).session(session);

      if (!customer) {
        throw new ApiError(statusCode.BAD_REQUEST, "Invalid customer for this nursery");
      }
    }

    seed.seedsUsed += data.quantity;
    await seed.save({ session });

    // Sowing only consumes seeds and records the event.
    // Inventory is intentionally created later at germination stage.
    const sowingBatch = await SowingBatch.create(
      [
        {
          seed: seed._id,
          nurseryId: user.nurseryId || seed.nurseryId || null,
          plantType: seed.plantType._id,
          customerId: data.customerId || null,
          quantitySown: data.quantity,
          sowingDate: data.sowingDate || new Date(),
          expectedYield: data.expectedYield,
          performedBy: user.userId,
          roleAtTime: user.role
        }
      ],
      { session }
    );

    if (data.customerId) {
      await createCustomerNotification({
        nurseryId: user.nurseryId || seed.nurseryId || null,
        customerId: data.customerId,
        type: "SOWING_UPDATED",
        title: "Seeds sown",
        message: `${data.quantity} seeds have been sown successfully.`,
        meta: { sowingId: sowingBatch[0]._id, seedId: seed._id },
        session
      });
    }

    await session.commitTransaction();
    session.endSession();

    const createdSowing = await SowingBatch.findById(sowingBatch[0]._id).populate(SOWING_POPULATION);
    return normalizeSowingCustomer(createdSowing);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

const getSowings = async (user) => {
  const query = {};
  if (user.role !== "SUPER_ADMIN" && user.nurseryId) {
    query.nurseryId = user.nurseryId;
  }

  if (user.role === "CUSTOMER") {
    const customer = await Customer.findOne({ userId: user.userId, deletedAt: { $exists: false } });
    if (!customer) return [];
    query.customerId = customer._id;
  }

  const sowings = await SowingBatch.find(query)
    .populate(SOWING_POPULATION)
    .sort({ createdAt: -1 });
  return sowings.map(normalizeSowingCustomer);
};

module.exports = {
  sowSeeds,
  getSowings
};
