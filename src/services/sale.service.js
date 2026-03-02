const mongoose = require("mongoose");
const Sale = require("../models/Sale.model");
const PlantInventory = require("../models/PlantInventory.model");
const Customer = require("../models/Customer.model");
const Payment = require("../models/Payment.model");
const FinancialLedgerEntry = require("../models/FinancialLedgerEntry.model");
const AuditLog = require("../models/AuditLog.model");
const InventoryTransaction = require("../models/InventoryTransaction.model");
const { upsertStaffAccount } = require("./staffAccount.service");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");
const { deductInventoryFIFO } = require("./inventory.service");
const { normalizeSaleCustomer } = require("../utils/customerIdentity.util");

const SALE_POPULATION = [
  {
    path: "items.inventory",
    populate: { path: "plantType", select: "name category variety sellingPrice images expectedSeedQtyPerBatch" }
  },
  {
    path: "items.batchDeductions.inventory",
    populate: { path: "plantType", select: "name category variety sellingPrice images expectedSeedQtyPerBatch" }
  },
  { path: "nurseryId", select: "name code settings.contactDetails settings.socialLinks settings.paymentConfig" },
  { path: "customer", select: "name mobileNumber" },
  { path: "performedBy", select: "name email role" }
];

const getPaymentStatus = (paidAmount, dueAmount) => {
  if (dueAmount <= 0) return "PAID";
  if (paidAmount > 0) return "PARTIALLY_PAID";
  return "UNPAID";
};

const generateSaleNumber = async (session) => {
  const count = await Sale.countDocuments({}).session(session);
  return `SALE-${String(count + 1).padStart(6, "0")}`;
};

const attachPaymentsToSales = async (sales) => {
  const list = Array.isArray(sales) ? sales : [];
  if (!list.length) return [];

  const saleIds = list
    .map((sale) => String(sale?._id || ""))
    .filter(Boolean);
  if (!saleIds.length) return list;

  const payments = await Payment.find({ saleId: { $in: saleIds } })
    .sort({ createdAt: -1 })
    .select("saleId amount mode status utrNumber transactionRef rejectionReason createdAt receivedAt verifiedAt");

  const paymentMap = new Map();
  for (const payment of payments) {
    const key = String(payment.saleId);
    if (!paymentMap.has(key)) paymentMap.set(key, []);
    paymentMap.get(key).push(payment);
  }

  return list.map((sale) => {
    const value = sale && typeof sale.toObject === "function" ? sale.toObject() : sale;
    const key = String(value?._id || "");
    return {
      ...value,
      payments: paymentMap.get(key) || []
    };
  });
};

const createSale = async (data, user) => {
  if (user.role !== "SUPER_ADMIN" && !user.nurseryId) {
    throw new ApiError(statusCode.BAD_REQUEST, "User is not assigned to a nursery");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (data.customer) {
      const customer = await Customer.findOne({
        _id: data.customer,
        deletedAt: { $exists: false },
        ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {})
      }).session(session);

      if (!customer) {
        throw new ApiError(statusCode.BAD_REQUEST, "Invalid customer for this nursery");
      }
    }

    let totalAmount = 0;
    let totalCost = 0;
    const saleItems = [];

    for (const item of data.items) {
      const requestedInventory = await PlantInventory.findById(item.inventoryId)
        .populate("plantType")
        .session(session);

      if (!requestedInventory) {
        throw new ApiError(statusCode.BAD_REQUEST, "Inventory item not found");
      }

      if (user.role !== "SUPER_ADMIN" && user.nurseryId && String(requestedInventory.nurseryId) !== String(user.nurseryId)) {
        throw new ApiError(statusCode.FORBIDDEN, "Cannot sell inventory from another nursery");
      }

      const priceAtSale = requestedInventory.plantType.sellingPrice;
      if (priceAtSale === undefined || priceAtSale === null) {
        throw new ApiError(
          statusCode.INTERNAL_SERVER_ERROR,
          "Selling price not configured for plant type"
        );
      }

      // Deduct by oldest available stock for the same plant type (FIFO by batch).
      const deductions = await deductInventoryFIFO(
        {
          plantTypeId: requestedInventory.plantType._id,
          quantity: item.quantity,
          nurseryId: user.nurseryId || null
        },
        session
      );

      // Capture COGS snapshot so profit remains immutable even if costs change later.
      const itemCost = deductions.reduce(
        (sum, deduction) => sum + deduction.quantity * deduction.unitCost,
        0
      );
      const itemRevenue = priceAtSale * item.quantity;
      const itemProfit = itemRevenue - itemCost;

      saleItems.push({
        inventory: requestedInventory._id,
        quantity: item.quantity,
        priceAtSale,
        costAtSale: itemCost,
        profit: itemProfit,
        batchDeductions: deductions
      });

      totalAmount += itemRevenue;
      totalCost += itemCost;

      await InventoryTransaction.create(
        [
          {
            nurseryId: user.nurseryId,
            inventoryId: requestedInventory._id,
            type: "OUTBOUND_SALE",
            quantity: item.quantity,
            unitCostSnapshot: itemCost / item.quantity,
            reason: "Sale deduction",
            performedBy: user.userId,
            referenceType: "Sale",
            referenceId: requestedInventory._id
          }
        ],
        { session }
      );
    }

    const totalProfit = totalAmount - totalCost;
    const grossMarginPercent = totalAmount
      ? Number(((totalProfit / totalAmount) * 100).toFixed(2))
      : 0;
    const discountAmount = data.discountAmount || 0;
    const netAmount = Math.max(totalAmount - discountAmount, 0);
    const paidAmount = Math.max(Math.min(data.amountPaid || 0, netAmount), 0);
    const dueAmount = Math.max(netAmount - paidAmount, 0);
    const saleNumber = await generateSaleNumber(session);
    const normalizedUtr = String(data.utrNumber || "").trim() || null;
    const normalizedTxRef = String(data.transactionRef || "").trim() || null;

    if (paidAmount > 0 && data.paymentMode !== "CASH" && !normalizedUtr) {
      throw new ApiError(
        statusCode.BAD_REQUEST,
        "utrNumber is required for non-cash payments when amountPaid is greater than 0"
      );
    }

    const [sale] = await Sale.create(
      [
        {
          nurseryId: user.nurseryId || null,
          saleNumber,
          customer: data.customer,
          items: saleItems,
          totalAmount,
          grossAmount: totalAmount,
          discountAmount,
          netAmount,
          paidAmount,
          dueAmount,
          paymentStatus: getPaymentStatus(paidAmount, dueAmount),
          verificationStatus: paidAmount > 0 ? "VERIFIED" : "NOT_REQUIRED",
          totalCost,
          totalProfit,
          grossMarginPercent,
          paymentMode: data.paymentMode,
          performedBy: user.userId,
          collectedBy: paidAmount > 0 ? user.userId : undefined,
          roleAtTime: user.role
        }
      ],
      { session }
    );

    await FinancialLedgerEntry.create(
      [
        {
          nurseryId: user.nurseryId || null,
          entryType: "SALE_POSTED",
          referenceType: "Sale",
          referenceId: sale._id,
          debit: 0,
          credit: netAmount,
          balanceImpact: netAmount,
          postedBy: user.userId,
          meta: { saleNumber }
        }
      ],
      { session }
    );

    if (paidAmount > 0) {
      await Payment.create(
        [
          {
            nurseryId: user.nurseryId || null,
            saleId: sale._id,
            customerId: data.customer,
            amount: paidAmount,
            mode: data.paymentMode,
            status: "VERIFIED",
            utrNumber: normalizedUtr,
            transactionRef: normalizedTxRef || normalizedUtr,
            verifiedAt: new Date(),
            verifiedBy: user.userId
          }
        ],
        { session }
      );

      await FinancialLedgerEntry.create(
        [
          {
            nurseryId: user.nurseryId || null,
            entryType: "PAYMENT_VERIFIED",
            referenceType: "Sale",
            referenceId: sale._id,
            debit: 0,
            credit: paidAmount,
            balanceImpact: paidAmount,
            postedBy: user.userId,
            meta: { saleNumber, source: "sale_create" }
          }
        ],
        { session }
      );
    }

    await upsertStaffAccount(
      {
        nurseryId: user.nurseryId || null,
        staffUserId: user.userId,
        staffRole: user.role,
        salesDelta: netAmount,
        collectedDelta: paidAmount
      },
      session
    );

    await AuditLog.create(
      [
        {
          nurseryId: user.nurseryId || null,
          actorUserId: user.userId,
          action: "SALE_CREATED",
          entityType: "Sale",
          entityId: sale._id,
          before: null,
          after: {
            totalAmount,
            netAmount,
            paidAmount,
            dueAmount,
            paymentStatus: getPaymentStatus(paidAmount, dueAmount)
          },
          occurredAt: new Date()
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    const createdSale = await Sale.findById(sale._id).populate(SALE_POPULATION);
    const [saleWithPayments] = await attachPaymentsToSales([createdSale]);
    return normalizeSaleCustomer(saleWithPayments);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const getAllSales = async (user) => {
  const query = { isVoided: { $ne: true } };
  if (user?.role !== "SUPER_ADMIN" && user?.nurseryId) {
    query.nurseryId = user.nurseryId;
  }

  if (user?.role === "CUSTOMER") {
    const customerProfile = await Customer.findOne({
      userId: user.userId,
      ...(user?.nurseryId ? { nurseryId: user.nurseryId } : {}),
      deletedAt: { $exists: false }
    }).select("_id");

    if (!customerProfile) return [];
    query.customer = customerProfile._id;
  }

  const sales = await Sale.find(query)
    .sort({ createdAt: -1 })
    .populate(SALE_POPULATION);
  const salesWithPayments = await attachPaymentsToSales(sales);
  return salesWithPayments.map(normalizeSaleCustomer);
};

const getSaleById = async (saleId, user) => {
  const query = { _id: saleId };
  if (user?.role !== "SUPER_ADMIN" && user?.nurseryId) {
    query.nurseryId = user.nurseryId;
  }

  if (user?.role === "CUSTOMER") {
    const customerProfile = await Customer.findOne({
      userId: user.userId,
      ...(user?.nurseryId ? { nurseryId: user.nurseryId } : {}),
      deletedAt: { $exists: false }
    }).select("_id");

    if (!customerProfile) {
      throw new ApiError(statusCode.NOT_FOUND, "Sale not found");
    }
    query.customer = customerProfile._id;
  }

  const sale = await Sale.findOne(query)
    .populate(SALE_POPULATION);

  if (!sale) {
    throw new ApiError(statusCode.NOT_FOUND, "Sale not found");
  }

  const [saleWithPayments] = await attachPaymentsToSales([sale]);
  return normalizeSaleCustomer(saleWithPayments);
};

module.exports = {
  createSale,
  getAllSales,
  getSaleById
};
