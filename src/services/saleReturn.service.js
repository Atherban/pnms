const mongoose = require("mongoose");
const Sale = require("../models/Sale.model");
const SaleReturn = require("../models/SaleReturn.model");
const PlantInventory = require("../models/PlantInventory.model");
const InventoryTransaction = require("../models/InventoryTransaction.model");
const FinancialLedgerEntry = require("../models/FinancialLedgerEntry.model");
const AuditLog = require("../models/AuditLog.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");

const createSaleReturn = async (saleId, payload, user) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await Sale.findById(saleId).session(session);
    if (!sale) {
      throw new ApiError(statusCode.NOT_FOUND, "Sale not found");
    }

    if (user?.role !== "SUPER_ADMIN" && user?.nurseryId && String(sale.nurseryId) !== String(user.nurseryId)) {
      throw new ApiError(statusCode.FORBIDDEN, "Cannot process return for another nursery");
    }

    const existingReturns = await SaleReturn.find({
      saleId: sale._id,
      status: { $in: ["APPROVED", "COMPLETED", "REQUESTED"] }
    }).session(session);

    const returnedByItem = new Map();
    for (const existingReturn of existingReturns) {
      for (const existingItem of existingReturn.items || []) {
        const key = String(existingItem.saleItemId);
        const current = returnedByItem.get(key) || 0;
        returnedByItem.set(key, current + Number(existingItem.quantityReturned || 0));
      }
    }

    const requestQtyByItem = new Map();
    for (const requestItem of payload.items) {
      const key = String(requestItem.saleItemId);
      requestQtyByItem.set(key, (requestQtyByItem.get(key) || 0) + Number(requestItem.quantityReturned || 0));
    }

    let totalRefund = 0;
    for (const [saleItemId, requestQty] of requestQtyByItem.entries()) {
      const saleItem = sale.items.id(saleItemId);
      if (!saleItem) {
        throw new ApiError(statusCode.BAD_REQUEST, "Invalid sale item in return request");
      }

      const alreadyReturnedQty = returnedByItem.get(saleItemId) || 0;
      const maxReturnableQty = Math.max(Number(saleItem.quantity || 0) - alreadyReturnedQty, 0);
      if (maxReturnableQty <= 0) {
        throw new ApiError(statusCode.BAD_REQUEST, "This sale item has already been fully returned");
      }

      if (requestQty > maxReturnableQty) {
        throw new ApiError(
          statusCode.BAD_REQUEST,
          "Returned quantity exceeds remaining returnable quantity for one or more sale items"
        );
      }

      const perItemPrice = saleItem.priceAtSale || 0;
      totalRefund += perItemPrice * requestQty;
    }

    const maxRefundable = (sale.paidAmount || 0) + (sale.dueAmount || 0);
    if (totalRefund > maxRefundable) {
      throw new ApiError(statusCode.BAD_REQUEST, "Return refund exceeds original sale value");
    }

    for (const returnItem of payload.items) {
      const saleItem = sale.items.id(returnItem.saleItemId);

      if (returnItem.inventoryAction === "RESTOCK") {
        const inventory = await PlantInventory.findById(saleItem.inventory).session(session);
        if (inventory) {
          inventory.quantity += returnItem.quantityReturned;
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
                quantity: returnItem.quantityReturned,
                unitCostSnapshot: saleItem.costAtSale / Math.max(saleItem.quantity, 1),
                reason: payload.reason,
                performedBy: user.userId,
                referenceType: "SaleReturn",
                referenceId: sale._id
              }
            ],
            { session }
          );
        }
      }
    }

    sale.paidAmount = Math.max((sale.paidAmount || 0) - totalRefund, 0);
    sale.dueAmount = Math.max((sale.netAmount || sale.totalAmount) - sale.paidAmount, 0);
    if (sale.dueAmount === 0) {
      sale.paymentStatus = "PAID";
    } else if (sale.paidAmount > 0) {
      sale.paymentStatus = "PARTIALLY_PAID";
    } else {
      sale.paymentStatus = "UNPAID";
    }
    await sale.save({ session });

    const [saleReturn] = await SaleReturn.create(
      [
        {
          nurseryId: sale.nurseryId,
          saleId: sale._id,
          items: payload.items.map((item) => ({
            ...item,
            refundAmount:
              ((sale.items.id(item.saleItemId)?.priceAtSale || 0) * item.quantityReturned)
          })),
          status: "COMPLETED",
          approvedBy: user.userId,
          reason: payload.reason
        }
      ],
      { session }
    );

    await FinancialLedgerEntry.create(
      [
        {
          nurseryId: sale.nurseryId,
          entryType: "REFUND_POSTED",
          referenceType: "SaleReturn",
          referenceId: saleReturn._id,
          debit: totalRefund,
          credit: 0,
          balanceImpact: -totalRefund,
          postedBy: user.userId,
          meta: { saleId: sale._id }
        }
      ],
      { session }
    );

    await AuditLog.create(
      [
        {
          nurseryId: sale.nurseryId || null,
          actorUserId: user.userId,
          action: "SALE_RETURN_CREATED",
          entityType: "SaleReturn",
          entityId: saleReturn._id,
          before: null,
          after: {
            saleId: sale._id,
            totalRefund,
            reason: payload.reason
          },
          occurredAt: new Date()
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return SaleReturn.findById(saleReturn._id);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

module.exports = {
  createSaleReturn
};
