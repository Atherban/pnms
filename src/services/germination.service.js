const mongoose = require("mongoose");
const Germination = require("../models/Germination.model");
const SowingBatch = require("../models/SowingBatch.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");
const {
  createInventoryFromGermination
} = require("./inventory.service");
const { createCustomerNotification } = require("./notification.service");
const Customer = require("../models/Customer.model");
const { normalizeGerminationCustomer } = require("../utils/customerIdentity.util");

const GERMINATION_POPULATION = [
  {
    path: "sowingId",
    populate: [
      { path: "seed", select: "name supplierName expiryDate images" },
      { path: "plantType", select: "name category variety sellingPrice images expectedSeedQtyPerBatch" },
      { path: "customerId", select: "mobileNumber" },
      { path: "performedBy", select: "name email role" }
    ]
  },
  {
    path: "inventoryBatch",
    populate: [
      { path: "plantType", select: "name category variety sellingPrice images expectedSeedQtyPerBatch" },
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

    if (user.role !== "SUPER_ADMIN" && user.nurseryId && String(sowing.nurseryId) !== String(user.nurseryId)) {
      throw new ApiError(statusCode.FORBIDDEN, "Cannot record germination for another nursery");
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
          nurseryId: user.nurseryId || sowing.nurseryId || null,
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
      session,
      user.userId,
      user.nurseryId || sowing.nurseryId || null
    );

    germination.inventoryBatch = inventory._id;
    await germination.save({ session });

    if (sowing.customerId) {
      await createCustomerNotification({
        nurseryId: user.nurseryId || sowing.nurseryId || null,
        customerId: sowing.customerId,
        type: "GERMINATION_UPDATED",
        title: "Germination complete",
        message: `${data.germinatedSeeds} seeds germinated, ${data.discardedSeeds || 0} discarded.`,
        meta: { germinationId: germination._id, sowingId: sowing._id },
        session
      });

      await createCustomerNotification({
        nurseryId: user.nurseryId || sowing.nurseryId || null,
        customerId: sowing.customerId,
        type: "PRODUCT_READY",
        title: "Plant ready",
        message: "Your plants are now ready and available in inventory.",
        meta: { inventoryBatchId: inventory._id },
        session
      });
    }

    await session.commitTransaction();
    session.endSession();

    const createdGermination = await Germination.findById(germination._id).populate(GERMINATION_POPULATION);
    return normalizeGerminationCustomer(createdGermination);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

const getGerminations = async (user) => {
  const query = {};
  if (user.role !== "SUPER_ADMIN" && user.nurseryId) {
    query.nurseryId = user.nurseryId;
  }

  if (user.role === "CUSTOMER") {
    const customer = await Customer.findOne({ userId: user.userId, deletedAt: { $exists: false } });
    if (!customer) return [];
    const sowings = await SowingBatch.find({ customerId: customer._id }).select("_id");
    query.sowingId = { $in: sowings.map((s) => s._id) };
  }

  const germinations = await Germination.find(query)
    .sort({ createdAt: -1 })
    .populate(GERMINATION_POPULATION);
  return germinations.map(normalizeGerminationCustomer);
};

module.exports = {
  recordGermination,
  getGerminations
};
