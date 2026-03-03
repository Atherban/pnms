const mongoose = require("mongoose");
const Germination = require("../models/Germination.model");
const SowingBatch = require("../models/SowingBatch.model");
const CustomerSeedBatch = require("../models/CustomerSeedBatch.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");
const {
  createInventoryFromGermination
} = require("./inventory.service");
const { createCustomerNotification } = require("./notification.service");
const Customer = require("../models/Customer.model");
const { createServiceSaleForBatch } = require("./customerSeedBatch.service");
const { normalizeGerminationCustomer } = require("../utils/customerIdentity.util");

const GERMINATION_POPULATION = [
  {
    path: "sowingId",
    populate: [
      { path: "seed", select: "name supplierName expiryDate images" },
      { path: "plantType", select: "name category variety sellingPrice images expectedSeedQtyPerBatch" },
      { path: "customerId", select: "mobileNumber" },
      {
        path: "customerSeedBatch",
        select:
          "seedQuantity seedsSown germinatedQuantity discardedQuantity status expectedReadyDate serviceChargeEstimate discountAmount finalAmount saleId"
      },
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
  {
    path: "customerSeedBatch",
    select:
      "seedQuantity seedsSown germinatedQuantity discardedQuantity status expectedReadyDate serviceChargeEstimate discountAmount finalAmount saleId"
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
      (sowing.quantitySown || 0) - (sowing.quantityGerminated || 0) - (sowing.quantityDiscarded || 0);
    if (data.germinatedSeeds + (data.discardedSeeds || 0) > availableForGermination) {
      throw new ApiError(
        statusCode.BAD_REQUEST,
        "Germinated + discarded seeds exceed remaining seeds in sowing batch"
      );
    }

    // Germination is the conversion point where usable seedlings become inventory.
    const [germination] = await Germination.create(
      [
        {
          nurseryId: user.nurseryId || sowing.nurseryId || null,
          sowingId: sowing._id,
          customerSeedBatch: sowing.customerSeedBatch || undefined,
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
    sowing.quantityDiscarded = (sowing.quantityDiscarded || 0) + (data.discardedSeeds || 0);
    await sowing.save({ session });

    const inventory = await createInventoryFromGermination(
      {
        plantType: sowing.plantType,
        quantity: data.germinatedSeeds,
        receivedAt: data.germinationDate || new Date(),
        customerId: sowing.customerId || undefined,
        customerSeedBatch: sowing.customerSeedBatch || undefined
      },
      germination._id,
      session,
      user.userId,
      user.nurseryId || sowing.nurseryId || null
    );

    germination.inventoryBatch = inventory._id;
    await germination.save({ session });

    if (sowing.customerSeedBatch) {
      const customerSeedBatch = await CustomerSeedBatch.findById(sowing.customerSeedBatch).session(session);
      if (customerSeedBatch) {
        customerSeedBatch.germinationId = germination._id;
        customerSeedBatch.germinatedQuantity =
          (customerSeedBatch.germinatedQuantity || customerSeedBatch.seedsGerminated || 0) +
          (data.germinatedSeeds || 0);
        customerSeedBatch.discardedQuantity =
          (customerSeedBatch.discardedQuantity || customerSeedBatch.seedsDiscarded || 0) +
          (data.discardedSeeds || 0);
        customerSeedBatch.seedsGerminated = customerSeedBatch.germinatedQuantity;
        customerSeedBatch.seedsDiscarded = customerSeedBatch.discardedQuantity;
        customerSeedBatch.updatedBy = user.userId;

        const totalProcessed =
          (customerSeedBatch.germinatedQuantity || 0) + (customerSeedBatch.discardedQuantity || 0);
        const totalSown = customerSeedBatch.seedsSown || 0;

        if (totalProcessed >= totalSown && totalSown > 0) {
          customerSeedBatch.status =
            (customerSeedBatch.germinatedQuantity || 0) > 0 ? "READY" : "DISCARDED";
          if (customerSeedBatch.status === "DISCARDED") {
            customerSeedBatch.discardedAt = new Date();
          }
        } else {
          customerSeedBatch.status = "GERMINATING";
        }

        await customerSeedBatch.save({ session });

        if (customerSeedBatch.status === "READY" && !customerSeedBatch.saleId) {
          const autoSale = await createServiceSaleForBatch({
            batch: customerSeedBatch,
            user,
            session
          });
          customerSeedBatch.saleId = autoSale._id;
          await customerSeedBatch.save({ session });

          if ((autoSale.dueAmount || 0) > 0) {
            await createCustomerNotification({
              nurseryId: user.nurseryId || sowing.nurseryId || null,
              customerId: sowing.customerId,
              type: "PAYMENT_DUE",
              title: "Payment due",
              message: `Service due amount is ${autoSale.dueAmount}.`,
              meta: { seedBatchId: customerSeedBatch._id, saleId: autoSale._id, dueAmount: autoSale.dueAmount },
              session
            });
          }
        }
      }
    }

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

      const sowingProcessed =
        (sowing.quantityGerminated || 0) + (sowing.quantityDiscarded || 0);
      if (sowingProcessed >= (sowing.quantitySown || 0)) {
        await createCustomerNotification({
          nurseryId: user.nurseryId || sowing.nurseryId || null,
          customerId: sowing.customerId,
          type: "PRODUCT_READY",
          title: "Plant ready",
          message: "Your plants are now ready and available in inventory.",
          meta: { inventoryBatchId: inventory._id, sowingId: sowing._id },
          session
        });
      }
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
