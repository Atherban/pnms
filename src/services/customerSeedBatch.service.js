const mongoose = require("mongoose");
const CustomerSeedBatch = require("../models/CustomerSeedBatch.model");
const Customer = require("../models/Customer.model");
const PlantType = require("../models/PlantType.model");
const Sale = require("../models/Sale.model");
const FinancialLedgerEntry = require("../models/FinancialLedgerEntry.model");
const AuditLog = require("../models/AuditLog.model");
const { upsertStaffAccount } = require("./staffAccount.service");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");
const { createCustomerNotification } = require("./notification.service");

const CUSTOMER_SEED_BATCH_POPULATION = [
  { path: "customerId", select: "name mobileNumber" },
  { path: "plantTypeId", select: "name category variety expectedSeedUnit expectedSeedQtyPerBatch" },
  { path: "sowingId", select: "quantitySown quantityGerminated quantityDiscarded sowingDate createdAt" },
  { path: "germinationId", select: "germinatedSeeds discardedSeeds germinationDate createdAt" },
  {
    path: "saleId",
    select: "saleNumber saleKind status totalAmount paidAmount dueAmount paymentStatus verificationStatus createdAt"
  },
  { path: "createdBy", select: "name role" },
  { path: "updatedBy", select: "name role" }
];

const resolveScopedNurseryId = (user, fallbackNurseryId = null) => {
  if (user?.role === "SUPER_ADMIN") {
    return user?.nurseryId || fallbackNurseryId || null;
  }
  if (!user?.nurseryId) {
    throw new ApiError(statusCode.BAD_REQUEST, "User is not assigned to a nursery");
  }
  return user.nurseryId;
};

const getCustomerProfileForUser = async (user) =>
  Customer.findOne({
    userId: user.userId,
    ...(user?.nurseryId ? { nurseryId: user.nurseryId } : {}),
    deletedAt: { $exists: false }
  }).select("_id nurseryId");

const normalizeAmounts = (payload = {}) => {
  const serviceChargeEstimate = Math.max(0, Number(payload.serviceChargeEstimate || 0));
  const discountAmount = Math.max(0, Number(payload.discountAmount || 0));
  const finalAmount =
    payload.finalAmount !== undefined && payload.finalAmount !== null
      ? Math.max(0, Number(payload.finalAmount || 0))
      : Math.max(serviceChargeEstimate - discountAmount, 0);
  return { serviceChargeEstimate, discountAmount, finalAmount };
};

const assertBatchIntegrity = (batch) => {
  const seedQuantity = Number(batch.seedQuantity || 0);
  const seedsSown = Number(batch.seedsSown || 0);
  const germinatedQuantity = Number(batch.germinatedQuantity || batch.seedsGerminated || 0);
  const discardedQuantity = Number(batch.discardedQuantity || batch.seedsDiscarded || 0);

  if (seedsSown > seedQuantity) {
    throw new ApiError(statusCode.BAD_REQUEST, "seedsSown cannot exceed seedQuantity");
  }
  if (germinatedQuantity + discardedQuantity > seedsSown) {
    throw new ApiError(
      statusCode.BAD_REQUEST,
      "germinatedQuantity + discardedQuantity cannot exceed seedsSown"
    );
  }
};

const buildServiceInvoiceFromBatch = (batch) => ({
  sowingCharge: Number(batch.finalAmount || 0),
  germinationCharge: 0,
  labourCharge: 0,
  soilCharge: 0,
  trayCharge: 0,
  maintenanceCharge: 0,
  otherCharge: 0,
  notes: `Auto generated from customer seed batch ${batch._id}`
});

const generateSaleNumber = async (session) => {
  const count = await Sale.countDocuments({}).session(session);
  return `SALE-${String(count + 1).padStart(6, "0")}`;
};

const createServiceSaleForBatch = async ({ batch, user, session }) => {
  const existingByBatch = await Sale.findOne({
    customerSeedBatch: batch._id,
    saleKind: "SERVICE_SALE"
  }).session(session);
  if (existingByBatch) {
    return existingByBatch;
  }

  if (batch.saleId) {
    const existingSale = await Sale.findById(batch.saleId).session(session);
    if (existingSale) return existingSale;
  }

  const netAmount = Math.max(0, Number(batch.finalAmount || 0));
  const saleNumber = await generateSaleNumber(session);

  const [sale] = await Sale.create(
    [
      {
        nurseryId: batch.nurseryId,
        saleNumber,
        saleKind: "SERVICE_SALE",
        status: "PENDING",
        customerSeedBatch: batch._id,
        serviceInvoice: buildServiceInvoiceFromBatch(batch),
        customer: batch.customerId,
        items: [],
        totalAmount: netAmount,
        grossAmount: netAmount,
        discountAmount: 0,
        netAmount,
        paidAmount: 0,
        dueAmount: netAmount,
        paymentStatus: netAmount > 0 ? "UNPAID" : "PAID",
        verificationStatus: "NOT_REQUIRED",
        totalCost: 0,
        totalProfit: netAmount,
        grossMarginPercent: netAmount > 0 ? 100 : 0,
        paymentMode: "CASH",
        performedBy: user.userId,
        roleAtTime: user.role
      }
    ],
    { session }
  );

  await FinancialLedgerEntry.create(
    [
      {
        nurseryId: batch.nurseryId,
        entryType: "SALE_POSTED",
        referenceType: "Sale",
        referenceId: sale._id,
        debit: 0,
        credit: netAmount,
        balanceImpact: netAmount,
        postedBy: user.userId,
        meta: {
          saleNumber,
          source: "customer_seed_batch_auto_sale",
          customerSeedBatchId: String(batch._id)
        }
      }
    ],
    { session }
  );

  await upsertStaffAccount(
    {
      nurseryId: batch.nurseryId,
      staffUserId: user.userId,
      staffRole: user.role,
      salesDelta: netAmount,
      collectedDelta: 0
    },
    session
  );

  await AuditLog.create(
    [
      {
        nurseryId: batch.nurseryId,
        actorUserId: user.userId,
        action: "SALE_CREATED",
        entityType: "Sale",
        entityId: sale._id,
        before: null,
        after: {
          saleKind: "SERVICE_SALE",
          totalAmount: netAmount,
          paidAmount: 0,
          dueAmount: netAmount,
          source: "CustomerSeedBatch"
        },
        occurredAt: new Date()
      }
    ],
    { session }
  );

  return sale;
};

const createCustomerSeedBatch = async (payload, user) => {
  const nurseryId = resolveScopedNurseryId(user);

  const customer = await Customer.findOne({
    _id: payload.customerId,
    ...(user?.role !== "SUPER_ADMIN" ? { nurseryId } : {}),
    deletedAt: { $exists: false }
  });
  if (!customer) {
    throw new ApiError(statusCode.BAD_REQUEST, "Invalid customer for this nursery");
  }

  const plantType = await PlantType.findOne({
    _id: payload.plantTypeId,
    ...(user?.role !== "SUPER_ADMIN" ? { nurseryId } : {}),
    deletedAt: { $exists: false }
  });
  if (!plantType) {
    throw new ApiError(statusCode.BAD_REQUEST, "Invalid plant type for this nursery");
  }

  const amountFields = normalizeAmounts(payload);
  const batch = await CustomerSeedBatch.create({
    nurseryId: nurseryId || customer.nurseryId,
    customerId: customer._id,
    plantTypeId: plantType._id,
    seedQuantity: payload.seedQuantity,
    expectedReadyDate: payload.expectedReadyDate || payload.estimatedPickupDate || undefined,
    estimatedPickupDate: payload.expectedReadyDate || payload.estimatedPickupDate || undefined,
    serviceChargeEstimate: amountFields.serviceChargeEstimate,
    discountAmount: amountFields.discountAmount,
    finalAmount: amountFields.finalAmount,
    notes: payload.notes || undefined,
    status: "RECEIVED",
    createdBy: user.userId
  });

  await createCustomerNotification({
    nurseryId: batch.nurseryId,
    customerId: customer._id,
    type: "SEED_BATCH_RECEIVED",
    title: "Seed batch received",
    message: `${payload.seedQuantity} seeds for ${plantType.name} have been received by nursery.`,
    meta: {
      seedBatchId: batch._id,
      plantTypeId: plantType._id
    }
  });

  return CustomerSeedBatch.findById(batch._id).populate(CUSTOMER_SEED_BATCH_POPULATION);
};

const getCustomerSeedBatches = async (user) => {
  const query = {};
  if (user.role !== "SUPER_ADMIN" && user.nurseryId) {
    query.nurseryId = user.nurseryId;
  }

  if (user.role === "CUSTOMER") {
    const customerProfile = await getCustomerProfileForUser(user);
    if (!customerProfile) return [];
    query.customerId = customerProfile._id;
  }

  return CustomerSeedBatch.find(query)
    .populate(CUSTOMER_SEED_BATCH_POPULATION)
    .sort({ createdAt: -1 });
};

const getCustomerSeedBatchById = async (id, user) => {
  const query = { _id: id };
  if (user.role !== "SUPER_ADMIN" && user.nurseryId) {
    query.nurseryId = user.nurseryId;
  }

  if (user.role === "CUSTOMER") {
    const customerProfile = await getCustomerProfileForUser(user);
    if (!customerProfile) {
      throw new ApiError(statusCode.NOT_FOUND, "Customer seed batch not found");
    }
    query.customerId = customerProfile._id;
  }

  const batch = await CustomerSeedBatch.findOne(query).populate(CUSTOMER_SEED_BATCH_POPULATION);
  if (!batch) {
    throw new ApiError(statusCode.NOT_FOUND, "Customer seed batch not found");
  }
  return batch;
};

const updateCustomerSeedBatch = async (id, payload, user) => {
  const batch = await getCustomerSeedBatchById(id, user);
  if (user.role === "CUSTOMER") {
    throw new ApiError(statusCode.FORBIDDEN, "Customer cannot update seed batches");
  }

  if (payload.seedQuantity !== undefined) batch.seedQuantity = payload.seedQuantity;
  if (payload.expectedReadyDate !== undefined) {
    batch.expectedReadyDate = payload.expectedReadyDate || undefined;
    batch.estimatedPickupDate = payload.expectedReadyDate || undefined;
  }
  if (payload.notes !== undefined) batch.notes = payload.notes || undefined;
  if (payload.status) batch.status = payload.status;

  const amountFields = normalizeAmounts({
    serviceChargeEstimate:
      payload.serviceChargeEstimate !== undefined
        ? payload.serviceChargeEstimate
        : batch.serviceChargeEstimate,
    discountAmount:
      payload.discountAmount !== undefined ? payload.discountAmount : batch.discountAmount,
    finalAmount: payload.finalAmount !== undefined ? payload.finalAmount : batch.finalAmount
  });
  batch.serviceChargeEstimate = amountFields.serviceChargeEstimate;
  batch.discountAmount = amountFields.discountAmount;
  batch.finalAmount = amountFields.finalAmount;

  assertBatchIntegrity(batch);
  batch.updatedBy = user.userId;
  await batch.save();
  return CustomerSeedBatch.findById(batch._id).populate(CUSTOMER_SEED_BATCH_POPULATION);
};

const markReadyCustomerSeedBatch = async (id, user) => {
  if (!["STAFF", "NURSERY_ADMIN", "SUPER_ADMIN"].includes(String(user.role || "").toUpperCase())) {
    throw new ApiError(statusCode.FORBIDDEN, "Only staff/admin can mark batch as ready");
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const batch = await CustomerSeedBatch.findOne({
      _id: id,
      ...(user.role !== "SUPER_ADMIN" && user.nurseryId ? { nurseryId: user.nurseryId } : {})
    }).session(session);
    if (!batch) {
      throw new ApiError(statusCode.NOT_FOUND, "Customer seed batch not found");
    }

    assertBatchIntegrity(batch);
    if ((batch.germinatedQuantity || 0) <= 0) {
      throw new ApiError(
        statusCode.BAD_REQUEST,
        "Batch cannot be marked READY before germination quantity is recorded"
      );
    }

    batch.status = "READY";
    batch.updatedBy = user.userId;
    batch.finalAmount = Math.max(
      Number(batch.finalAmount || 0),
      Math.max(Number(batch.serviceChargeEstimate || 0) - Number(batch.discountAmount || 0), 0)
    );

    const sale = await createServiceSaleForBatch({ batch, user, session });
    batch.saleId = sale._id;
    await batch.save({ session });

    await createCustomerNotification({
      nurseryId: batch.nurseryId,
      customerId: batch.customerId,
      type: "PRODUCT_READY",
      title: "Plants ready for pickup",
      message: "Your seed batch is ready for pickup from nursery.",
      meta: { seedBatchId: batch._id, saleId: sale._id },
      session
    });

    if ((sale.dueAmount || 0) > 0) {
      await createCustomerNotification({
        nurseryId: batch.nurseryId,
        customerId: batch.customerId,
        type: "PAYMENT_DUE",
        title: "Payment due",
        message: `Service due amount is ${sale.dueAmount}.`,
        meta: { seedBatchId: batch._id, saleId: sale._id, dueAmount: sale.dueAmount },
        session
      });
    }

    await session.commitTransaction();
    session.endSession();

    return CustomerSeedBatch.findById(batch._id).populate(CUSTOMER_SEED_BATCH_POPULATION);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const collectCustomerSeedBatch = async (id, user) => {
  if (!["STAFF", "NURSERY_ADMIN", "SUPER_ADMIN"].includes(String(user.role || "").toUpperCase())) {
    throw new ApiError(statusCode.FORBIDDEN, "Only staff/admin can mark batch as collected");
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const batch = await CustomerSeedBatch.findOne({
      _id: id,
      ...(user.role !== "SUPER_ADMIN" && user.nurseryId ? { nurseryId: user.nurseryId } : {})
    }).session(session);
    if (!batch) {
      throw new ApiError(statusCode.NOT_FOUND, "Customer seed batch not found");
    }

    if (batch.status !== "READY" && batch.status !== "COLLECTED") {
      throw new ApiError(statusCode.BAD_REQUEST, "Batch can be collected only when status is READY");
    }

    if (!batch.saleId) {
      throw new ApiError(
        statusCode.BAD_REQUEST,
        "Batch cannot be collected before service sale is generated"
      );
    }

    const sale = await Sale.findById(batch.saleId).session(session);
    if (!sale) {
      throw new ApiError(statusCode.NOT_FOUND, "Linked sale not found");
    }

    sale.status = "COMPLETED";
    await sale.save({ session });

    batch.status = "COLLECTED";
    batch.collectedAt = new Date();
    batch.updatedBy = user.userId;
    if ((sale.dueAmount || 0) <= 0) {
      batch.status = "CLOSED";
    }
    await batch.save({ session });

    await createCustomerNotification({
      nurseryId: batch.nurseryId,
      customerId: batch.customerId,
      type: "PRODUCT_READY",
      title: "Plants collected",
      message: "Your plants have been marked as collected.",
      meta: { seedBatchId: batch._id, saleId: sale._id },
      session
    });

    await session.commitTransaction();
    session.endSession();
    return CustomerSeedBatch.findById(batch._id).populate(CUSTOMER_SEED_BATCH_POPULATION);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

module.exports = {
  createCustomerSeedBatch,
  getCustomerSeedBatches,
  getCustomerSeedBatchById,
  updateCustomerSeedBatch,
  markReadyCustomerSeedBatch,
  collectCustomerSeedBatch,
  createServiceSaleForBatch
};
