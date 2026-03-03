const mongoose = require("mongoose");
const Sale = require("../models/Sale.model");
const SaleReturn = require("../models/SaleReturn.model");
const PlantInventory = require("../models/PlantInventory.model");
const InventoryTransaction = require("../models/InventoryTransaction.model");
const FinancialLedgerEntry = require("../models/FinancialLedgerEntry.model");
const AuditLog = require("../models/AuditLog.model");
const Customer = require("../models/Customer.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");

const SALE_RETURN_POPULATION = [
  { path: "saleId", select: "saleNumber customer paidAmount dueAmount netAmount totalAmount status" },
  { path: "approvedBy", select: "name role" },
  { path: "requestedBy", select: "name role" }
];

const validateSaleScope = async (saleId, user, session, forCustomerAccess = false) => {
  const query = { _id: saleId };

  if (user?.role !== "SUPER_ADMIN" && user?.nurseryId) {
    query.nurseryId = user.nurseryId;
  }

  const sale = await Sale.findOne(query).session(session);
  if (!sale) {
    throw new ApiError(statusCode.NOT_FOUND, "Sale not found");
  }

  if (forCustomerAccess && user?.role === "CUSTOMER") {
    const customerProfile = await Customer.findOne({
      userId: user.userId,
      ...(user?.nurseryId ? { nurseryId: user.nurseryId } : {}),
      deletedAt: { $exists: false }
    })
      .select("_id")
      .session(session);

    if (!customerProfile || String(sale.customer) !== String(customerProfile._id)) {
      throw new ApiError(statusCode.FORBIDDEN, "Cannot request return for another customer's purchase");
    }
  }

  return sale;
};

const aggregateReturnQtyBySaleItem = async (saleId, session) => {
  const rows = await SaleReturn.find({
    saleId,
    status: { $in: ["REQUESTED", "APPROVED", "COMPLETED"] }
  })
    .select("items itemsReturned")
    .session(session);

  const map = new Map();
  for (const row of rows) {
    const items = Array.isArray(row.itemsReturned) && row.itemsReturned.length
      ? row.itemsReturned
      : row.items || [];
    for (const item of items) {
      const key = String(item.saleItemId || "");
      map.set(key, (map.get(key) || 0) + Number(item.quantityReturned || 0));
    }
  }

  return map;
};

const buildReturnItemRows = (sale, requestedItems) => {
  const requestQtyByItem = new Map();
  for (const requestItem of requestedItems || []) {
    const key = String(requestItem.saleItemId || "");
    requestQtyByItem.set(key, (requestQtyByItem.get(key) || 0) + Number(requestItem.quantityReturned || 0));
  }

  const output = [];
  let grossReturnAmount = 0;
  for (const [saleItemId, qty] of requestQtyByItem.entries()) {
    const saleItem = sale.items.id(saleItemId);
    if (!saleItem) {
      throw new ApiError(statusCode.BAD_REQUEST, "Invalid sale item in return request");
    }

    const itemPrice = Number(saleItem.priceAtSale || 0);
    const itemRefund = itemPrice * qty;
    grossReturnAmount += itemRefund;
    output.push({
      saleItemId,
      quantityReturned: qty,
      inventoryAction: (requestedItems.find((x) => String(x.saleItemId) === saleItemId)?.inventoryAction || "RESTOCK"),
      refundAmount: itemRefund
    });
  }

  return { items: output, grossReturnAmount };
};

const assertReturnQuantities = ({ sale, currentReservedByItem, requestedItems }) => {
  for (const reqItem of requestedItems) {
    const saleItemId = String(reqItem.saleItemId);
    const saleItem = sale.items.id(saleItemId);

    if (!saleItem) {
      throw new ApiError(statusCode.BAD_REQUEST, "Invalid sale item in return request");
    }

    const totalSold = Number(saleItem.quantity || 0);
    const alreadyReserved = Number(currentReservedByItem.get(saleItemId) || 0);
    const remaining = Math.max(totalSold - alreadyReserved, 0);

    if (remaining <= 0) {
      throw new ApiError(statusCode.BAD_REQUEST, "This sale item is already fully returned/requested");
    }

    if (Number(reqItem.quantityReturned || 0) > remaining) {
      throw new ApiError(
        statusCode.BAD_REQUEST,
        "Return quantity cannot exceed remaining returnable quantity"
      );
    }
  }
};

const calculateSaleAdjustment = (sale, grossReturnAmount) => {
  const grossSale = Number(sale.grossAmount ?? sale.totalAmount ?? 0);
  const netSale = Number(sale.netAmount ?? sale.totalAmount ?? 0);
  const paidAmount = Number(sale.paidAmount || 0);

  const ratio = grossSale > 0 ? Math.max(Math.min((grossSale - netSale) / grossSale, 1), 0) : 0;
  const netReturnAmount = Math.max(grossReturnAmount * (1 - ratio), 0);

  const adjustedNetAmount = Math.max(netSale - netReturnAmount, 0);
  const refundAmount = Math.max(Math.min(paidAmount - adjustedNetAmount, paidAmount), 0);
  const adjustedPaidAmount = Math.max(paidAmount - refundAmount, 0);
  const adjustedDueAmount = Math.max(adjustedNetAmount - adjustedPaidAmount, 0);

  return {
    grossReturnAmount: Number(grossReturnAmount.toFixed(2)),
    netReturnAmount: Number(netReturnAmount.toFixed(2)),
    adjustedNetAmount: Number(adjustedNetAmount.toFixed(2)),
    adjustedPaidAmount: Number(adjustedPaidAmount.toFixed(2)),
    adjustedDueAmount: Number(adjustedDueAmount.toFixed(2)),
    refundAmount: Number(refundAmount.toFixed(2))
  };
};

const recalculatePaymentStatus = (sale) => {
  const due = Number(sale.dueAmount || 0);
  const paid = Number(sale.paidAmount || 0);

  if (due <= 0) {
    sale.paymentStatus = "PAID";
  } else if (paid > 0) {
    sale.paymentStatus = "PARTIALLY_PAID";
  } else {
    sale.paymentStatus = "UNPAID";
  }
};

const updateSaleReturnStatus = (sale, completedReturnQty) => {
  let soldQty = 0;
  for (const item of sale.items || []) {
    soldQty += Number(item.quantity || 0);
  }

  if (soldQty > 0 && completedReturnQty >= soldQty) {
    sale.status = "RETURNED";
  } else if (completedReturnQty > 0) {
    sale.status = "PARTIALLY_RETURNED";
  }
};

const createReturnReceiptNumber = () => `RET-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

const createSaleReturn = async (saleId, payload, user) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await validateSaleScope(saleId, user, session, true);

    const currentReservedByItem = await aggregateReturnQtyBySaleItem(sale._id, session);
    assertReturnQuantities({
      sale,
      currentReservedByItem,
      requestedItems: payload.items || []
    });

    const { items, grossReturnAmount } = buildReturnItemRows(sale, payload.items || []);

    const [saleReturn] = await SaleReturn.create(
      [
        {
          nurseryId: sale.nurseryId,
          saleId: sale._id,
          items,
          itemsReturned: items,
          requestedBy: user.userId,
          status: "REQUESTED",
          reason: payload.reason,
          refundAmount: 0,
          receipt: {
            receiptNumber: createReturnReceiptNumber(),
            generatedAt: new Date(),
            generatedBy: user.userId,
            saleNumber: sale.saleNumber,
            saleId: sale._id,
            itemsReturned: items,
            reason: payload.reason,
            totals: {
              grossReturnAmount,
              netReturnAmount: 0,
              refundIssued: 0
            }
          }
        }
      ],
      { session }
    );

    await AuditLog.create(
      [
        {
          nurseryId: sale.nurseryId || null,
          actorUserId: user.userId,
          action: "SALE_RETURN_REQUESTED",
          entityType: "SaleReturn",
          entityId: saleReturn._id,
          before: null,
          after: {
            saleId: sale._id,
            reason: payload.reason,
            requestedItems: items
          },
          occurredAt: new Date()
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return SaleReturn.findById(saleReturn._id).populate(SALE_RETURN_POPULATION);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const listSaleReturns = async (query, user) => {
  const filter = {};
  if (user?.role !== "SUPER_ADMIN" && user?.nurseryId) {
    filter.nurseryId = user.nurseryId;
  }

  if (query.saleId) {
    filter.saleId = query.saleId;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (user?.role === "CUSTOMER") {
    const customerProfile = await Customer.findOne({
      userId: user.userId,
      ...(user?.nurseryId ? { nurseryId: user.nurseryId } : {}),
      deletedAt: { $exists: false }
    }).select("_id");

    if (!customerProfile) return [];

    const allowedSaleIds = await Sale.find({
      customer: customerProfile._id,
      ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {})
    }).select("_id");

    filter.saleId = { $in: allowedSaleIds.map((x) => x._id) };
  }

  return SaleReturn.find(filter)
    .sort({ createdAt: -1 })
    .populate(SALE_RETURN_POPULATION)
    .lean();
};

const getSaleReturnById = async (returnId, user) => {
  const filter = { _id: returnId };
  if (user?.role !== "SUPER_ADMIN" && user?.nurseryId) {
    filter.nurseryId = user.nurseryId;
  }

  const row = await SaleReturn.findOne(filter).populate(SALE_RETURN_POPULATION);
  if (!row) {
    throw new ApiError(statusCode.NOT_FOUND, "Return request not found");
  }

  if (user?.role === "CUSTOMER") {
    const customerProfile = await Customer.findOne({
      userId: user.userId,
      ...(user?.nurseryId ? { nurseryId: user.nurseryId } : {}),
      deletedAt: { $exists: false }
    }).select("_id");

    const saleCustomerId = String(row?.saleId?.customer || "");
    if (!customerProfile || String(customerProfile._id) !== saleCustomerId) {
      throw new ApiError(statusCode.FORBIDDEN, "Unauthorized access to return request");
    }
  }

  return row;
};

const approveSaleReturn = async (returnId, user) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const filter = { _id: returnId };
    if (user?.role !== "SUPER_ADMIN" && user?.nurseryId) {
      filter.nurseryId = user.nurseryId;
    }

    const saleReturn = await SaleReturn.findOne(filter).session(session);
    if (!saleReturn) {
      throw new ApiError(statusCode.NOT_FOUND, "Return request not found");
    }

    if (saleReturn.status !== "REQUESTED") {
      throw new ApiError(statusCode.BAD_REQUEST, "Only requested returns can be approved");
    }

    saleReturn.status = "APPROVED";
    saleReturn.approvedBy = user.userId;
    saleReturn.approvedAt = new Date();
    await saleReturn.save({ session });

    await AuditLog.create(
      [
        {
          nurseryId: saleReturn.nurseryId || null,
          actorUserId: user.userId,
          action: "SALE_RETURN_APPROVED",
          entityType: "SaleReturn",
          entityId: saleReturn._id,
          before: { status: "REQUESTED" },
          after: { status: "APPROVED" },
          occurredAt: new Date()
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return SaleReturn.findById(saleReturn._id).populate(SALE_RETURN_POPULATION);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const rejectSaleReturn = async (returnId, payload, user) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const filter = { _id: returnId };
    if (user?.role !== "SUPER_ADMIN" && user?.nurseryId) {
      filter.nurseryId = user.nurseryId;
    }

    const saleReturn = await SaleReturn.findOne(filter).session(session);
    if (!saleReturn) {
      throw new ApiError(statusCode.NOT_FOUND, "Return request not found");
    }

    if (saleReturn.status !== "REQUESTED") {
      throw new ApiError(statusCode.BAD_REQUEST, "Only requested returns can be rejected");
    }

    saleReturn.status = "REJECTED";
    saleReturn.approvedBy = user.userId;
    saleReturn.approvedAt = new Date();
    saleReturn.rejectedReason = payload.reason;
    await saleReturn.save({ session });

    await AuditLog.create(
      [
        {
          nurseryId: saleReturn.nurseryId || null,
          actorUserId: user.userId,
          action: "SALE_RETURN_REJECTED",
          entityType: "SaleReturn",
          entityId: saleReturn._id,
          before: { status: "REQUESTED" },
          after: { status: "REJECTED", reason: payload.reason },
          occurredAt: new Date()
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return SaleReturn.findById(saleReturn._id).populate(SALE_RETURN_POPULATION);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const completeSaleReturn = async (returnId, user) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const filter = { _id: returnId };
    if (user?.role !== "SUPER_ADMIN" && user?.nurseryId) {
      filter.nurseryId = user.nurseryId;
    }

    const saleReturn = await SaleReturn.findOne(filter).session(session);
    if (!saleReturn) {
      throw new ApiError(statusCode.NOT_FOUND, "Return request not found");
    }

    if (saleReturn.status !== "APPROVED") {
      throw new ApiError(statusCode.BAD_REQUEST, "Only approved return requests can be completed");
    }

    const sale = await Sale.findById(saleReturn.saleId).session(session);
    if (!sale) {
      throw new ApiError(statusCode.NOT_FOUND, "Sale not found");
    }

    const completedQtyByItem = new Map();
    const priorCompleted = await SaleReturn.find({
      saleId: sale._id,
      status: "COMPLETED",
      _id: { $ne: saleReturn._id }
    })
      .select("items itemsReturned")
      .session(session);

    for (const row of priorCompleted) {
      const items = Array.isArray(row.itemsReturned) && row.itemsReturned.length
        ? row.itemsReturned
        : row.items || [];
      for (const it of items) {
        const key = String(it.saleItemId || "");
        completedQtyByItem.set(key, (completedQtyByItem.get(key) || 0) + Number(it.quantityReturned || 0));
      }
    }

    const requestItems = Array.isArray(saleReturn.itemsReturned) && saleReturn.itemsReturned.length
      ? saleReturn.itemsReturned
      : saleReturn.items || [];

    for (const reqItem of requestItems) {
      const saleItem = sale.items.id(reqItem.saleItemId);
      if (!saleItem) {
        throw new ApiError(statusCode.BAD_REQUEST, "Return includes invalid sale item");
      }

      const alreadyCompleted = Number(completedQtyByItem.get(String(reqItem.saleItemId)) || 0);
      const maxRemaining = Math.max(Number(saleItem.quantity || 0) - alreadyCompleted, 0);
      if (Number(reqItem.quantityReturned || 0) > maxRemaining) {
        throw new ApiError(statusCode.CONFLICT, "Return quantity exceeds remaining eligible quantity");
      }
    }

    let completedQty = 0;
    for (const item of requestItems) {
      const saleItem = sale.items.id(item.saleItemId);
      if (!saleItem) continue;
      completedQty += Number(item.quantityReturned || 0);

      if (item.inventoryAction === "RESTOCK") {
        const inventory = await PlantInventory.findById(saleItem.inventory).session(session);
        if (inventory) {
          inventory.quantity = Number(inventory.quantity || 0) + Number(item.quantityReturned || 0);
          inventory.status = "AVAILABLE";
          if (inventory.growthStage === "SOLD_OUT") {
            inventory.growthStage = "READY_FOR_SALE";
          }
          await inventory.save({ session });

          await InventoryTransaction.create(
            [
              {
                nurseryId: sale.nurseryId,
                inventoryId: inventory._id,
                type: "INBOUND_RETURN",
                quantity: Number(item.quantityReturned || 0),
                unitCostSnapshot: Number(saleItem.costAtSale || 0) / Math.max(Number(saleItem.quantity || 1), 1),
                reason: saleReturn.reason,
                performedBy: user.userId,
                referenceType: "SaleReturn",
                referenceId: saleReturn._id
              }
            ],
            { session }
          );
        }
      }
    }

    let grossReturnAmount = 0;
    for (const item of requestItems) {
      const saleItem = sale.items.id(item.saleItemId);
      if (!saleItem) continue;
      grossReturnAmount += Number(saleItem.priceAtSale || 0) * Number(item.quantityReturned || 0);
    }

    const adjustment = calculateSaleAdjustment(sale, grossReturnAmount);

    sale.netAmount = adjustment.adjustedNetAmount;
    sale.grossAmount = Math.max(Number(sale.grossAmount || sale.totalAmount || 0) - adjustment.grossReturnAmount, 0);
    sale.totalAmount = sale.netAmount;
    sale.paidAmount = adjustment.adjustedPaidAmount;
    sale.dueAmount = adjustment.adjustedDueAmount;
    recalculatePaymentStatus(sale);

    const completedTotalQty = completedQty + priorCompleted.reduce((sum, r) => {
      const rows = Array.isArray(r.itemsReturned) && r.itemsReturned.length ? r.itemsReturned : r.items || [];
      return sum + rows.reduce((s, it) => s + Number(it.quantityReturned || 0), 0);
    }, 0);

    updateSaleReturnStatus(sale, completedTotalQty);
    await sale.save({ session });

    saleReturn.status = "COMPLETED";
    saleReturn.completedAt = new Date();
    saleReturn.refundAmount = adjustment.refundAmount;
    saleReturn.approvedBy = saleReturn.approvedBy || user.userId;
    saleReturn.approvedAt = saleReturn.approvedAt || new Date();
    saleReturn.receipt = {
      ...(saleReturn.receipt || {}),
      returnId: saleReturn._id,
      saleId: sale._id,
      saleNumber: sale.saleNumber,
      generatedBy: user.userId,
      generatedAt: new Date(),
      approval: {
        approvedBy: saleReturn.approvedBy || user.userId,
        approvedAt: saleReturn.approvedAt || new Date()
      },
      totals: {
        grossReturnAmount: adjustment.grossReturnAmount,
        netReturnAmount: adjustment.netReturnAmount,
        refundIssued: adjustment.refundAmount
      }
    };
    await saleReturn.save({ session });

    if (adjustment.refundAmount > 0) {
      await FinancialLedgerEntry.create(
        [
          {
            nurseryId: sale.nurseryId,
            entryType: "REFUND_POSTED",
            referenceType: "SaleReturn",
            referenceId: saleReturn._id,
            debit: adjustment.refundAmount,
            credit: 0,
            balanceImpact: -adjustment.refundAmount,
            postedBy: user.userId,
            meta: {
              saleId: sale._id,
              saleNumber: sale.saleNumber
            }
          }
        ],
        { session }
      );
    }

    await AuditLog.create(
      [
        {
          nurseryId: sale.nurseryId || null,
          actorUserId: user.userId,
          action: "SALE_RETURN_COMPLETED",
          entityType: "SaleReturn",
          entityId: saleReturn._id,
          before: { status: "APPROVED" },
          after: {
            status: "COMPLETED",
            refundAmount: adjustment.refundAmount,
            netReturnAmount: adjustment.netReturnAmount
          },
          occurredAt: new Date()
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return SaleReturn.findById(saleReturn._id).populate(SALE_RETURN_POPULATION);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

module.exports = {
  createSaleReturn,
  listSaleReturns,
  getSaleReturnById,
  approveSaleReturn,
  rejectSaleReturn,
  completeSaleReturn,
  __private: {
    calculateSaleAdjustment,
    recalculatePaymentStatus
  }
};
