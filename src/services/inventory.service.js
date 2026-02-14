const Expense = require("../models/Expense.model");
const PlantInventory = require("../models/PlantInventory.model");
const PlantType = require("../models/PlantType.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");

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
  { plantType, quantity, receivedAt, unitCost },
  sourceRef,
  session
) => {
  const plantTypeDoc = await PlantType.findById(plantType).session(session);
  if (!plantTypeDoc) {
    throw new ApiError(statusCode.BAD_REQUEST, "Invalid plant type");
  }

  const resolvedUnitCost = resolveInventoryUnitCost(unitCost, plantTypeDoc);

  const [inventory] = await PlantInventory.create(
    [
      {
        plantType,
        sourceType: "GERMINATION",
        sourceModel: "Germination",
        sourceRef,
        quantity,
        initialQuantity: quantity,
        unitCost: resolvedUnitCost,
        growthStage: "READY_FOR_SALE",
        receivedAt: receivedAt || new Date()
      }
    ],
    { session }
  );

  return inventory;
};

const createPurchasedInventory = async (payload, user, session) => {
  const plantType = await PlantType.findById(payload.plantType).session(session);
  if (!plantType) {
    throw new ApiError(statusCode.BAD_REQUEST, "Invalid plant type");
  }

  const resolvedUnitCost = resolveInventoryUnitCost(payload.unitCost, plantType);

  const [expense] = await Expense.create(
    [
      {
        type: "OTHER",
        description:
          payload.note ||
          `Purchased ready plants${payload.supplierName ? ` from ${payload.supplierName}` : ""}`,
        amount: payload.quantity * resolvedUnitCost,
        date: payload.purchaseDate || new Date()
      }
    ],
    { session }
  );

  const [inventory] = await PlantInventory.create(
    [
      {
        plantType: payload.plantType,
        sourceType: "PURCHASED",
        sourceModel: "Expense",
        sourceRef: expense._id,
        quantity: payload.quantity,
        initialQuantity: payload.quantity,
        unitCost: resolvedUnitCost,
        growthStage: "READY_FOR_SALE",
        receivedAt: payload.purchaseDate || new Date()
      }
    ],
    { session }
  );

  return { inventory, expense };
};

const deductInventoryFIFO = async ({ plantTypeId, quantity }, session) => {
  const batches = await PlantInventory.find({
    plantType: plantTypeId,
    status: "AVAILABLE",
    quantity: { $gt: 0 }
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
