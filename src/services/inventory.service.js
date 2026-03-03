const Expense = require("../models/Expense.model");
const PlantInventory = require("../models/PlantInventory.model");
const PlantType = require("../models/PlantType.model");
const InventoryTransaction = require("../models/InventoryTransaction.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");

const QUANTITY_UNITS = ["SEEDS", "GRAM", "KG", "UNITS"];

const normalizeQuantityUnit = (value, fallback = "UNITS") => {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toUpperCase();
  return QUANTITY_UNITS.includes(normalized) ? normalized : fallback;
};

const resolveInventoryQuantityUnit = (requestedQuantityUnit, plantType) =>
  normalizeQuantityUnit(
    requestedQuantityUnit,
    normalizeQuantityUnit(plantType?.expectedSeedUnit, "UNITS")
  );

const resolveInventoryUnitCost = (requestedUnitCost, plantType) => {
  if (requestedUnitCost !== undefined && requestedUnitCost !== null && requestedUnitCost > 0) {
    return requestedUnitCost;
  }

  if (plantType.defaultCostPrice !== undefined && plantType.defaultCostPrice > 0) {
    return plantType.defaultCostPrice;
  }

  if (plantType.sellingPrice !== undefined && plantType.sellingPrice > 0) {
    return plantType.sellingPrice;
  }

  throw new ApiError(
    statusCode.BAD_REQUEST,
    "Unable to derive inventory unit cost. Configure defaultCostPrice or sellingPrice for this plant type."
  );
};

const createInventoryFromGermination = async (
  { plantType, quantity, receivedAt, unitCost, customerId, customerSeedBatch },
  sourceRef,
  session,
  performedBy,
  nurseryId
) => {
  const plantTypeDoc = await PlantType.findById(plantType).session(session);
  if (!plantTypeDoc) {
    throw new ApiError(statusCode.BAD_REQUEST, "Invalid plant type");
  }

  const resolvedUnitCost = resolveInventoryUnitCost(unitCost, plantTypeDoc);
  const resolvedQuantityUnit = resolveInventoryQuantityUnit(undefined, plantTypeDoc);

  const [inventory] = await PlantInventory.create(
    [
      {
        nurseryId: nurseryId || null,
        plantType,
        sourceType: customerSeedBatch ? "CUSTOMER_SEED_BATCH" : "GERMINATION",
        sourceModel: customerSeedBatch ? "CustomerSeedBatch" : "Germination",
        sourceRef: customerSeedBatch || sourceRef,
        customerId: customerId || undefined,
        customerSeedBatch: customerSeedBatch || undefined,
        quantity,
        quantityUnit: resolvedQuantityUnit,
        initialQuantity: quantity,
        unitCost: resolvedUnitCost,
        growthStage: "READY_FOR_SALE",
        receivedAt: receivedAt || new Date()
      }
    ],
    { session }
  );

  await InventoryTransaction.create(
    [
      {
        nurseryId: nurseryId || null,
        inventoryId: inventory._id,
        type: "INBOUND_GERMINATION",
        quantity,
        quantityUnitSnapshot: resolvedQuantityUnit,
        unitCostSnapshot: resolvedUnitCost,
        reason: customerSeedBatch
          ? "Inventory created from customer seed batch germination"
          : "Inventory created from germination",
        performedBy,
        referenceType: customerSeedBatch ? "CustomerSeedBatch" : "Germination",
        referenceId: customerSeedBatch || sourceRef
      }
    ],
    { session }
  );

  return inventory;
};

const createPurchasedInventory = async (payload, user, session) => {
  if (user.role !== "SUPER_ADMIN" && !user.nurseryId) {
    throw new ApiError(statusCode.BAD_REQUEST, "User is not assigned to a nursery");
  }

  const plantType = await PlantType.findOne({
    _id: payload.plantType,
    ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {})
  }).session(session);
  if (!plantType) {
    throw new ApiError(statusCode.BAD_REQUEST, "Invalid plant type");
  }

  const resolvedUnitCost = resolveInventoryUnitCost(payload.unitCost, plantType);
  const resolvedQuantityUnit = resolveInventoryQuantityUnit(payload.quantityUnit, plantType);

  const [expense] = await Expense.create(
    [
      {
        nurseryId: user?.nurseryId || null,
        type: "OTHER",
        description:
          payload.note ||
          `Purchased ready plants${payload.supplierName ? ` from ${payload.supplierName}` : ""}`,
        amount: payload.quantity * resolvedUnitCost,
        date: payload.purchaseDate || new Date(),
        purchasedBy: user?.userId
      }
    ],
    { session }
  );

  const [inventory] = await PlantInventory.create(
    [
      {
        nurseryId: user?.nurseryId || null,
        plantType: payload.plantType,
        sourceType: "PURCHASED",
        sourceModel: "Expense",
        sourceRef: expense._id,
        quantity: payload.quantity,
        quantityUnit: resolvedQuantityUnit,
        initialQuantity: payload.quantity,
        unitCost: resolvedUnitCost,
        growthStage: "READY_FOR_SALE",
        receivedAt: payload.purchaseDate || new Date()
      }
    ],
    { session }
  );

  await InventoryTransaction.create(
    [
      {
        nurseryId: user?.nurseryId || null,
        inventoryId: inventory._id,
        type: "INBOUND_PURCHASE",
        quantity: payload.quantity,
        quantityUnitSnapshot: resolvedQuantityUnit,
        unitCostSnapshot: resolvedUnitCost,
        reason: payload.note || "Purchased inventory",
        performedBy: user?.userId,
        referenceType: "Expense",
        referenceId: expense._id
      }
    ],
    { session }
  );

  return { inventory, expense };
};

const deductInventoryFIFO = async ({ plantTypeId, quantity, nurseryId }, session) => {
  const batches = await PlantInventory.find({
    plantType: plantTypeId,
    ...(nurseryId ? { nurseryId } : {}),
    status: "AVAILABLE",
    quantity: { $gt: 0 },
    $or: [{ customerId: { $exists: false } }, { customerId: null }]
  })
    .populate("plantType", "defaultCostPrice sellingPrice")
    .sort({ receivedAt: 1, createdAt: 1 })
    .session(session);

  let remaining = quantity;
  const deductions = [];

  for (const batch of batches) {
    if (remaining <= 0) {
      break;
    }

    const usedQty = Math.min(batch.quantity, remaining);
    const resolvedBatchUnitCost = resolveInventoryUnitCost(batch.unitCost, batch.plantType);

    if (!batch.unitCost || batch.unitCost <= 0) {
      batch.unitCost = resolvedBatchUnitCost;
    }

    batch.quantity -= usedQty;
    if (batch.quantity === 0) {
      batch.status = "OUT_OF_STOCK";
      batch.growthStage = "SOLD_OUT";
    }

    await batch.save({ session });

    deductions.push({
      inventory: batch._id,
      quantity: usedQty,
      unitCost: resolvedBatchUnitCost
    });

    remaining -= usedQty;
  }

  if (remaining > 0) {
    throw new ApiError(statusCode.BAD_REQUEST, "Insufficient inventory stock");
  }

  return deductions;
};

module.exports = {
  createInventoryFromGermination,
  createPurchasedInventory,
  deductInventoryFIFO
};
