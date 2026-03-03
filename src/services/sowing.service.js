const mongoose = require("mongoose");
const Seed = require("../models/Seed.model");
const SowingBatch = require("../models/SowingBatch.model");
const Customer = require("../models/Customer.model");
const CustomerSeedBatch = require("../models/CustomerSeedBatch.model");
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
  {
    path: "customerSeedBatch",
    select:
      "seedQuantity seedsSown germinatedQuantity discardedQuantity status expectedReadyDate serviceChargeEstimate discountAmount finalAmount saleId"
  },
  { path: "performedBy", select: "name email role" }
];

const sowSeeds = async (data, user) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let seed = null;
    let customerSeedBatch = null;
    let plantTypeId = null;
    let nurseryId = user.nurseryId || null;
    let customerId = data.customerId || null;

    if (data.customerSeedBatchId) {
      customerSeedBatch = await CustomerSeedBatch.findById(data.customerSeedBatchId)
        .populate("plantTypeId")
        .session(session);

      if (!customerSeedBatch) {
        throw new ApiError(statusCode.NOT_FOUND, "Customer seed batch not found");
      }

      if (
        user.role !== "SUPER_ADMIN" &&
        user.nurseryId &&
        String(customerSeedBatch.nurseryId) !== String(user.nurseryId)
      ) {
        throw new ApiError(statusCode.FORBIDDEN, "Cannot sow customer seed batch from another nursery");
      }

      if (["COLLECTED", "CLOSED", "DISCARDED"].includes(customerSeedBatch.status)) {
        throw new ApiError(statusCode.BAD_REQUEST, "Cannot sow this customer seed batch in current status");
      }

      const remainingSeedsForSowing = Math.max(
        (customerSeedBatch.seedQuantity || 0) - (customerSeedBatch.seedsSown || 0),
        0
      );
      if (data.quantity > remainingSeedsForSowing) {
        throw new ApiError(statusCode.BAD_REQUEST, "Seeds used exceed customer seed batch quantity");
      }

      if (customerId && String(customerId) !== String(customerSeedBatch.customerId)) {
        throw new ApiError(
          statusCode.BAD_REQUEST,
          "customerId does not match selected customer seed batch ownership"
        );
      }

      customerId = customerSeedBatch.customerId;
      plantTypeId = customerSeedBatch.plantTypeId?._id || customerSeedBatch.plantTypeId;
      nurseryId = customerSeedBatch.nurseryId || nurseryId;
    } else {
      seed = await Seed.findById(data.seedId)
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

      seed.seedsUsed += data.quantity;
      await seed.save({ session });

      plantTypeId = seed.plantType._id;
      nurseryId = seed.nurseryId || nurseryId;
    }

    if (customerId) {
      const customer = await Customer.findOne({
        _id: customerId,
        deletedAt: { $exists: false },
        ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {})
      }).session(session);

      if (!customer) {
        throw new ApiError(statusCode.BAD_REQUEST, "Invalid customer for this nursery");
      }
    }

    // Sowing only consumes seeds and records the event.
    // Inventory is intentionally created later at germination stage.
    const sowingBatch = await SowingBatch.create(
      [
        {
          seed: seed?._id || null,
          customerSeedBatch: customerSeedBatch?._id || null,
          nurseryId,
          plantType: plantTypeId,
          customerId: customerId || null,
          quantitySown: data.quantity,
          sowingDate: data.sowingDate || new Date(),
          expectedYield: data.expectedYield,
          performedBy: user.userId,
          roleAtTime: user.role
        }
      ],
      { session }
    );

    if (customerSeedBatch) {
      customerSeedBatch.seedsSown = (customerSeedBatch.seedsSown || 0) + data.quantity;
      customerSeedBatch.sowingId = sowingBatch[0]._id;
      customerSeedBatch.status = "SOWN";
      customerSeedBatch.updatedBy = user.userId;
      await customerSeedBatch.save({ session });
    }

    if (customerId) {
      await createCustomerNotification({
        nurseryId,
        customerId,
        type: "SOWING_UPDATED",
        title: "Seeds sown",
        message: `${data.quantity} seeds have been sown successfully.`,
        meta: {
          sowingId: sowingBatch[0]._id,
          ...(seed?._id ? { seedId: seed._id } : {}),
          ...(customerSeedBatch?._id ? { customerSeedBatchId: customerSeedBatch._id } : {})
        },
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
