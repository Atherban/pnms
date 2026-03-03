const mongoose = require("mongoose");
const Sale = require("../models/Sale.model");
const PlantInventory = require("../models/PlantInventory.model");
const Customer = require("../models/Customer.model");
const CustomerSeedBatch = require("../models/CustomerSeedBatch.model");
const Payment = require("../models/Payment.model");
const SaleReturn = require("../models/SaleReturn.model");
const FinancialLedgerEntry = require("../models/FinancialLedgerEntry.model");
const AuditLog = require("../models/AuditLog.model");
const InventoryTransaction = require("../models/InventoryTransaction.model");
const { upsertStaffAccount } = require("./staffAccount.service");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");
const { deductInventoryFIFO } = require("./inventory.service");
const { normalizeSaleCustomer } = require("../utils/customerIdentity.util");
const { createCustomerNotification } = require("./notification.service");

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
  {
    path: "customerSeedBatch",
    select: "seedQuantity seedsSown seedsGerminated seedsDiscarded status estimatedPickupDate",
    populate: { path: "plantTypeId", select: "name category variety" }
  },
  { path: "performedBy", select: "name email role" }
];

const getPaymentStatus = (paidAmount, dueAmount) => {
  if (dueAmount <= 0) return "PAID";
  if (paidAmount > 0) return "PARTIALLY_PAID";
  return "UNPAID";
};

const normalizePaymentMode = (mode) => {
  const normalized = String(mode || "").trim().toUpperCase();
  if (normalized === "BANK") return "BANK_TRANSFER";
  return normalized;
};

const generateSaleNumber = async (session) => {
  const dateSegment = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const randomSegment = Math.floor(1000 + Math.random() * 9000);
    const candidate = `SALE-${dateSegment}-${randomSegment}`;
    const exists = await Sale.exists({ saleNumber: candidate }).session(session);
    if (!exists) return candidate;
  }

  return `SALE-${dateSegment}-${Date.now().toString().slice(-6)}`;
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

const attachReturnsToSales = async (sales) => {
  const list = Array.isArray(sales) ? sales : [];
  if (!list.length) return [];

  const saleIds = list.map((sale) => String(sale?._id || "")).filter(Boolean);
  if (!saleIds.length) return list;

  const returns = await SaleReturn.find({ saleId: { $in: saleIds } })
    .sort({ createdAt: -1 })
    .select("saleId status items itemsReturned reason refundAmount createdAt approvedAt completedAt")
    .lean();

  const map = new Map();
  for (const row of returns) {
    const key = String(row.saleId || "");
    if (!map.has(key)) map.set(key, []);
    const items = Array.isArray(row.itemsReturned) && row.itemsReturned.length
      ? row.itemsReturned
      : row.items || [];
    const quantity = items.reduce((sum, item) => sum + Number(item.quantityReturned || 0), 0);
    const computedRefund = Number(row.refundAmount || 0) || items.reduce((sum, item) => sum + Number(item.refundAmount || 0), 0);
    map.get(key).push({
      _id: row._id,
      status: row.status,
      quantity,
      refundAmount: Number(computedRefund.toFixed(2)),
      reason: row.reason,
      items,
      createdAt: row.createdAt,
      approvedAt: row.approvedAt,
      completedAt: row.completedAt
    });
  }

  return list.map((sale) => {
    const value = sale && typeof sale.toObject === "function" ? sale.toObject() : sale;
    const key = String(value?._id || "");
    return {
      ...value,
      returns: map.get(key) || []
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
    const requestedSaleKind = String(data.saleKind || "PRODUCT").toUpperCase();
    const saleKind = requestedSaleKind === "SERVICE" ? "SERVICE_SALE" : requestedSaleKind;
    const paymentMode = normalizePaymentMode(data.paymentMode);
    let totalAmount = 0;
    let totalCost = 0;
    let totalProfit = 0;
    let grossMarginPercent = 0;
    const saleItems = [];
    const pendingInventoryTransactions = [];
    let serviceInvoice = null;
    let inferredCustomerId = data.customer ? String(data.customer) : null;
    let inferredCustomerSeedBatchId = data.customerSeedBatchId ? String(data.customerSeedBatchId) : null;

    if (saleKind === "SERVICE_SALE") {
      if (!data.customer) {
        throw new ApiError(statusCode.BAD_REQUEST, "Customer is required for service invoices");
      }

      if (data.customerSeedBatchId) {
        const customerSeedBatch = await CustomerSeedBatch.findOne({
          _id: data.customerSeedBatchId,
          customerId: data.customer,
          ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {})
        }).session(session);

        if (!customerSeedBatch) {
          throw new ApiError(statusCode.BAD_REQUEST, "Invalid customer seed batch for service invoice");
        }
      }

      const rawInvoice = data.serviceInvoice || {};
      serviceInvoice = {
        sowingCharge: Number(rawInvoice.sowingCharge || 0),
        germinationCharge: Number(rawInvoice.germinationCharge || 0),
        labourCharge: Number(rawInvoice.labourCharge || 0),
        soilCharge: Number(rawInvoice.soilCharge || 0),
        trayCharge: Number(rawInvoice.trayCharge || 0),
        maintenanceCharge: Number(rawInvoice.maintenanceCharge || 0),
        otherCharge: Number(rawInvoice.otherCharge || 0),
        notes: rawInvoice.notes || undefined
      };

      totalAmount =
        serviceInvoice.sowingCharge +
        serviceInvoice.germinationCharge +
        serviceInvoice.labourCharge +
        serviceInvoice.soilCharge +
        serviceInvoice.trayCharge +
        serviceInvoice.maintenanceCharge +
        serviceInvoice.otherCharge;

      if (totalAmount <= 0) {
        throw new ApiError(statusCode.BAD_REQUEST, "Service invoice total must be greater than 0");
      }

      totalCost = 0;
      totalProfit = totalAmount;
      grossMarginPercent = 100;
    } else {
      for (const item of data.items || []) {
        const requestedInventory = await PlantInventory.findById(item.inventoryId)
          .populate("plantType")
          .session(session);

        if (!requestedInventory) {
          throw new ApiError(statusCode.BAD_REQUEST, "Inventory item not found");
        }

        if (user.role !== "SUPER_ADMIN" && user.nurseryId && String(requestedInventory.nurseryId) !== String(user.nurseryId)) {
          throw new ApiError(statusCode.FORBIDDEN, "Cannot sell inventory from another nursery");
        }

        if (
          requestedInventory.sourceType === "CUSTOMER_SEED_BATCH" ||
          requestedInventory.customerSeedBatch ||
          requestedInventory.customerId
        ) {
          const sourceBatchId =
            requestedInventory.customerSeedBatch ||
            (requestedInventory.sourceType === "CUSTOMER_SEED_BATCH"
              ? requestedInventory.sourceRef
              : null);

          let sourceBatch = null;
          if (sourceBatchId) {
            sourceBatch = await CustomerSeedBatch.findById(sourceBatchId).session(session);
          }

          const inventoryCustomerId =
            sourceBatch?.customerId || requestedInventory.customerId || null;
          if (!inventoryCustomerId) {
            throw new ApiError(
              statusCode.BAD_REQUEST,
              "Customer-linked inventory is missing customer ownership"
            );
          }

          if (inferredCustomerId && String(inferredCustomerId) !== String(inventoryCustomerId)) {
            throw new ApiError(
              statusCode.BAD_REQUEST,
              "Sale items include customer-linked inventory from multiple customers"
            );
          }
          inferredCustomerId = String(inventoryCustomerId);

          if (sourceBatch?._id) {
            if (
              inferredCustomerSeedBatchId &&
              String(inferredCustomerSeedBatchId) !== String(sourceBatch._id)
            ) {
              throw new ApiError(
                statusCode.BAD_REQUEST,
                "Sale items include inventory from multiple customer seed batches"
              );
            }
            inferredCustomerSeedBatchId = String(sourceBatch._id);
          }
        }

        const priceAtSale = requestedInventory.plantType.sellingPrice;
        if (priceAtSale === undefined || priceAtSale === null) {
          throw new ApiError(
            statusCode.INTERNAL_SERVER_ERROR,
            "Selling price not configured for plant type"
          );
        }

        let deductions = [];
        const isCustomerLinkedInventory =
          requestedInventory.sourceType === "CUSTOMER_SEED_BATCH" ||
          requestedInventory.customerSeedBatch ||
          requestedInventory.customerId;

        if (isCustomerLinkedInventory) {
          if (item.quantity > requestedInventory.quantity) {
            throw new ApiError(
              statusCode.BAD_REQUEST,
              "Insufficient quantity in selected customer seed batch inventory"
            );
          }

          const unitCost =
            requestedInventory.unitCost ||
            requestedInventory?.plantType?.defaultCostPrice ||
            requestedInventory?.plantType?.sellingPrice ||
            0;
          requestedInventory.quantity -= item.quantity;
          if (requestedInventory.quantity <= 0) {
            requestedInventory.quantity = 0;
            requestedInventory.status = "OUT_OF_STOCK";
            requestedInventory.growthStage = "SOLD_OUT";
          }
          await requestedInventory.save({ session });

          deductions = [
            {
              inventory: requestedInventory._id,
              quantity: item.quantity,
              unitCost
            }
          ];
        } else {
          // Deduct by oldest available stock for the same plant type (FIFO by batch).
          deductions = await deductInventoryFIFO(
            {
              plantTypeId: requestedInventory.plantType._id,
              quantity: item.quantity,
              nurseryId: user.nurseryId || null
            },
            session
          );
        }

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

        pendingInventoryTransactions.push({
          nurseryId: user.nurseryId,
          inventoryId: requestedInventory._id,
          type: "OUTBOUND_SALE",
          quantity: item.quantity,
          unitCostSnapshot: itemCost / item.quantity,
          reason: "Sale deduction",
          performedBy: user.userId,
          referenceType: "Sale"
        });
      }

      totalProfit = totalAmount - totalCost;
      grossMarginPercent = totalAmount
        ? Number(((totalProfit / totalAmount) * 100).toFixed(2))
        : 0;
    }

    if (inferredCustomerId) {
      const customer = await Customer.findOne({
        _id: inferredCustomerId,
        deletedAt: { $exists: false },
        ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {})
      }).session(session);

      if (!customer) {
        throw new ApiError(statusCode.BAD_REQUEST, "Invalid customer for this nursery");
      }
    }

    const discountAmount = data.discountAmount || 0;
    const netAmount = Math.max(totalAmount - discountAmount, 0);
    const paidAmount = Math.max(Math.min(data.amountPaid || 0, netAmount), 0);
    const dueAmount = Math.max(netAmount - paidAmount, 0);
    const saleNumber = await generateSaleNumber(session);
    const normalizedUtr = String(data.utrNumber || "").trim() || null;
    const normalizedTxRef = String(data.transactionRef || "").trim() || null;

    if (paidAmount > 0 && paymentMode !== "CASH" && !normalizedUtr) {
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
          saleKind,
          status: saleKind === "SERVICE_SALE" ? "PENDING" : "COMPLETED",
          customerSeedBatch: inferredCustomerSeedBatchId || undefined,
          serviceInvoice: serviceInvoice || undefined,
          customer: inferredCustomerId || undefined,
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
          paymentMode,
          performedBy: user.userId,
          collectedBy: paidAmount > 0 ? user.userId : undefined,
          roleAtTime: user.role
        }
      ],
      { session }
    );

    if (pendingInventoryTransactions.length) {
      await InventoryTransaction.create(
        pendingInventoryTransactions.map((entry) => ({
          ...entry,
          referenceId: sale._id
        })),
        { session }
      );
    }

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
            customerId: inferredCustomerId || undefined,
            amount: paidAmount,
            mode: paymentMode,
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

    if (inferredCustomerId && dueAmount > 0) {
      await createCustomerNotification({
        nurseryId: user.nurseryId || null,
        customerId: inferredCustomerId,
        type: "PAYMENT_DUE",
        title: "Payment due",
        message: `You have pending due of ${dueAmount} for ${saleKind === "SERVICE_SALE" ? "service invoice" : "sale"} ${saleNumber}.`,
        meta: { saleId: sale._id, saleNumber, dueAmount },
        session
      });
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
  const salesWithReturns = await attachReturnsToSales(salesWithPayments);
  return salesWithReturns.map(normalizeSaleCustomer);
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
  const [saleWithReturns] = await attachReturnsToSales([saleWithPayments]);
  return normalizeSaleCustomer(saleWithReturns);
};

module.exports = {
  createSale,
  getAllSales,
  getSaleById
};
