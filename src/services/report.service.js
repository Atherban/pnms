const Sale = require("../models/Sale.model");
const SaleReturn = require("../models/SaleReturn.model");
const Payment = require("../models/Payment.model");
const Expense = require("../models/Expense.model");
const StaffAccount = require("../models/StaffAccount.model");
const PlantInventory = require("../models/PlantInventory.model");
const InventoryTransaction = require("../models/InventoryTransaction.model");
const SowingBatch = require("../models/SowingBatch.model");
const Seed = require("../models/Seed.model");
const Customer = require("../models/Customer.model");
const Nursery = require("../models/Nursery.model");
const ReportJob = require("../models/ReportJob.model");
const User = require("../models/User.model");
const { buildSimplePdfBuffer } = require("../utils/pdfGenerator");
const { buildExcelBuffer } = require("../utils/excelGenerator");

const REPORT_TYPES = new Set([
  "SALES",
  "PAYMENT_DUES",
  "INVENTORY",
  "STAFF_ACCOUNTING",
  "EXPENSES",
  "PROFITABILITY"
]);

const applyNurseryScope = (user, requestedNurseryId) => {
  if (user?.nurseryId) return user.nurseryId;
  if (user?.role === "SUPER_ADMIN" && requestedNurseryId) return requestedNurseryId;
  return null;
};

const buildDateRange = (startDate, endDate) => {
  const range = {};
  if (startDate) range.$gte = new Date(startDate);
  if (endDate) range.$lte = new Date(endDate);
  return Object.keys(range).length ? range : null;
};

const toMoney = (value) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
};

const getBaseFilters = ({ nurseryId, startDate, endDate, staffId, customerId, plantTypeId }) => {
  const dateRange = buildDateRange(startDate, endDate);

  const saleFilter = { isVoided: { $ne: true } };
  const paymentFilter = {};
  const inventoryFilter = {};
  const expenseFilter = { deletedAt: { $exists: false } };
  const returnFilter = {};
  const inventoryTxFilter = {};
  const sowingFilter = {};
  const seedFilter = {};
  const customerFilter = { deletedAt: { $exists: false } };

  if (nurseryId) {
    saleFilter.nurseryId = nurseryId;
    paymentFilter.nurseryId = nurseryId;
    inventoryFilter.nurseryId = nurseryId;
    expenseFilter.nurseryId = nurseryId;
    returnFilter.nurseryId = nurseryId;
    inventoryTxFilter.nurseryId = nurseryId;
    sowingFilter.nurseryId = nurseryId;
    seedFilter.nurseryId = nurseryId;
    customerFilter.nurseryId = nurseryId;
  }

  if (staffId) {
    saleFilter.performedBy = staffId;
    paymentFilter.verifiedBy = staffId;
    expenseFilter.purchasedBy = staffId;
    inventoryTxFilter.performedBy = staffId;
    sowingFilter.performedBy = staffId;
  }

  if (customerId) {
    saleFilter.customer = customerId;
    paymentFilter.customerId = customerId;
    customerFilter._id = customerId;
    inventoryFilter.customerId = customerId;
    sowingFilter.customerId = customerId;
  }

  if (dateRange) {
    saleFilter.$or = [{ saleDate: dateRange }, { createdAt: dateRange }];
    paymentFilter.createdAt = dateRange;
    expenseFilter.date = dateRange;
    returnFilter.createdAt = dateRange;
    inventoryTxFilter.createdAt = dateRange;
    sowingFilter.createdAt = dateRange;
    seedFilter.createdAt = dateRange;
    customerFilter.createdAt = dateRange;
  }

  if (plantTypeId) {
    inventoryFilter.plantType = plantTypeId;
    sowingFilter.plantType = plantTypeId;
    seedFilter.plantType = plantTypeId;
  }

  return {
    saleFilter,
    paymentFilter,
    inventoryFilter,
    expenseFilter,
    returnFilter,
    inventoryTxFilter,
    sowingFilter,
    seedFilter,
    customerFilter
  };
};

const getAnalyticsOverview = async ({ user, nurseryId, startDate, endDate, staffId, customerId, plantTypeId }) => {
  const scopedNurseryId = user ? applyNurseryScope(user, nurseryId) : (nurseryId || null);
  const {
    saleFilter,
    paymentFilter,
    inventoryFilter,
    expenseFilter,
    returnFilter,
    inventoryTxFilter,
    sowingFilter,
    seedFilter,
    customerFilter
  } = getBaseFilters({
    nurseryId: scopedNurseryId,
    startDate,
    endDate,
    staffId,
    customerId,
    plantTypeId
  });

  const [
    saleTotals,
    paymentTotals,
    expenseTotals,
    returnTotals,
    inventoryState,
    inventoryTxTotals,
    lifecycleTotals,
    customerTotals,
    staffSales,
    staffCollections,
    staffExpenses,
    staffAccountRows
  ] = await Promise.all([
    Sale.aggregate([
      { $match: saleFilter },
      {
        $group: {
          _id: null,
          totalSalesValue: { $sum: { $ifNull: ["$netAmount", "$totalAmount"] } },
          totalPaid: { $sum: { $ifNull: ["$paidAmount", 0] } },
          totalDue: { $sum: { $ifNull: ["$dueAmount", 0] } },
          totalProfit: { $sum: { $ifNull: ["$totalProfit", 0] } },
          totalSoldPlants: {
            $sum: {
              $reduce: {
                input: "$items",
                initialValue: 0,
                in: { $add: ["$$value", { $ifNull: ["$$this.quantity", 0] }] }
              }
            }
          }
        }
      }
    ]),
    Payment.aggregate([
      { $match: { ...paymentFilter, status: "VERIFIED" } },
      { $group: { _id: null, totalPaid: { $sum: { $ifNull: ["$amount", 0] } } } }
    ]),
    Expense.aggregate([
      { $match: expenseFilter },
      { $group: { _id: null, totalExpenses: { $sum: { $ifNull: ["$amount", 0] } } } }
    ]),
    SaleReturn.aggregate([
      { $match: { ...returnFilter, status: { $in: ["APPROVED", "COMPLETED"] } } },
      {
        $group: {
          _id: null,
          totalRefunded: { $sum: { $ifNull: ["$refundAmount", 0] } },
          totalReturnedPlants: {
            $sum: {
              $reduce: {
                input: "$itemsReturned",
                initialValue: 0,
                in: { $add: ["$$value", { $ifNull: ["$$this.quantityReturned", 0] }] }
              }
            }
          }
        }
      }
    ]),
    PlantInventory.aggregate([
      { $match: inventoryFilter },
      { $group: { _id: null, totalAvailablePlants: { $sum: { $ifNull: ["$quantity", 0] } } } }
    ]),
    InventoryTransaction.aggregate([
      { $match: inventoryTxFilter },
      {
        $group: {
          _id: null,
          plantsReturned: {
            $sum: {
              $cond: [{ $eq: ["$type", "INBOUND_RETURN"] }, { $ifNull: ["$quantity", 0] }, 0]
            }
          },
          plantsDiscarded: {
            $sum: {
              $cond: [
                { $in: ["$type", ["ADJUSTMENT_LOSS", "ADJUSTMENT_DAMAGE"]] },
                { $ifNull: ["$quantity", 0] },
                0
              ]
            }
          }
        }
      }
    ]),
    Promise.all([
      Seed.aggregate([{ $match: seedFilter }, { $group: { _id: null, seedsPurchased: { $sum: { $ifNull: ["$totalPurchased", 0] } } } }]),
      SowingBatch.aggregate([
        { $match: sowingFilter },
        {
          $group: {
            _id: null,
            seedsSown: { $sum: { $ifNull: ["quantitySown", 0] } },
            germinatedPlants: { $sum: { $ifNull: ["quantityGerminated", 0] } },
            discardedSeeds: { $sum: { $ifNull: ["quantityDiscarded", 0] } }
          }
        }
      ])
    ]),
    Promise.all([
      Customer.countDocuments(customerFilter),
      Sale.aggregate([
        { $match: { ...saleFilter, customer: { $ne: null }, dueAmount: { $gt: 0 } } },
        { $group: { _id: "$customer" } },
        { $count: "count" }
      ]),
      Sale.aggregate([
        { $match: { ...saleFilter, customer: { $ne: null }, dueAmount: { $lte: 0 } } },
        { $group: { _id: "$customer" } },
        { $count: "count" }
      ])
    ]),
    Sale.aggregate([
      { $match: saleFilter },
      { $group: { _id: "$performedBy", salesMade: { $sum: 1 } } }
    ]),
    Sale.aggregate([
      { $match: saleFilter },
      { $group: { _id: "$performedBy", collections: { $sum: { $ifNull: ["$paidAmount", 0] } } } }
    ]),
    Expense.aggregate([
      { $match: expenseFilter },
      { $group: { _id: "$purchasedBy", expensesRecorded: { $sum: { $ifNull: ["$amount", 0] } } } }
    ]),
    StaffAccount.find({
      ...(scopedNurseryId ? { nurseryId: scopedNurseryId } : {}),
      ...(staffId ? { staffUserId: staffId } : {})
    })
      .populate("staffUserId", "name")
      .sort({ periodEnd: -1 })
      .limit(100)
  ]);

  const saleMetrics = saleTotals[0] || {};
  const paymentMetrics = paymentTotals[0] || {};
  const expenseMetrics = expenseTotals[0] || {};
  const returnMetrics = returnTotals[0] || {};
  const inventoryMetrics = inventoryState[0] || {};
  const inventoryTxMetrics = inventoryTxTotals[0] || {};
  const seedPurchaseMetrics = lifecycleTotals[0][0] || {};
  const sowingMetrics = lifecycleTotals[1][0] || {};
  const staffIds = [
    ...new Set(
      []
        .concat(staffSales.map((row) => String(row?._id || "")))
        .concat(staffCollections.map((row) => String(row?._id || "")))
        .concat(staffExpenses.map((row) => String(row?._id || "")))
        .concat(staffAccountRows.map((row) => String(row?.staffUserId?._id || row?.staffUserId || "")))
        .filter(Boolean)
    )
  ];
  const staffUsers = staffIds.length
    ? await User.find({ _id: { $in: staffIds } }).select("_id name")
    : [];

  const customerDueCount = customerTotals[1][0]?.count || 0;
  const customerCompletedCount = customerTotals[2][0]?.count || 0;
  const staffNameById = new Map(
    (staffUsers || []).map((user) => [String(user._id), user.name || "Unknown Staff"])
  );

  const staffMap = new Map();
  for (const row of staffSales) {
    const key = String(row._id || "");
    if (!key) continue;
    staffMap.set(key, {
      staffUserId: key,
      staffName: staffNameById.get(key),
      salesMade: row.salesMade || 0,
      collections: 0,
      expensesRecorded: 0
    });
  }
  for (const row of staffCollections) {
    const key = String(row._id || "");
    if (!key) continue;
    const existing = staffMap.get(key) || {
      staffUserId: key,
      staffName: staffNameById.get(key),
      salesMade: 0,
      collections: 0,
      expensesRecorded: 0
    };
    existing.staffName = existing.staffName || staffNameById.get(key);
    existing.collections = toMoney(row.collections);
    staffMap.set(key, existing);
  }
  for (const row of staffExpenses) {
    const key = String(row._id || "");
    if (!key) continue;
    const existing = staffMap.get(key) || {
      staffUserId: key,
      staffName: staffNameById.get(key),
      salesMade: 0,
      collections: 0,
      expensesRecorded: 0
    };
    existing.staffName = existing.staffName || staffNameById.get(key);
    existing.expensesRecorded = toMoney(row.expensesRecorded);
    staffMap.set(key, existing);
  }

  const staffFromAccounts = staffAccountRows.map((row) => ({
    staffUserId: String(row.staffUserId?._id || row.staffUserId || ""),
    staffName:
      row.staffUserId?.name ||
      staffNameById.get(String(row.staffUserId?._id || row.staffUserId || "")) ||
      "Unknown Staff",
    salesMade: row.totalSalesAmount || 0,
    collections: row.totalCollectedAmount || 0,
    expensesRecorded: row.totalExpensesRecorded || 0
  }));

  const staffAnalytics = Array.from(staffMap.values()).concat(
    staffFromAccounts.filter((row) => row.staffUserId && !staffMap.has(row.staffUserId))
  );

  const totalSalesValue = toMoney(saleMetrics.totalSalesValue);
  const totalPaid = toMoney(saleMetrics.totalPaid || paymentMetrics.totalPaid);
  const totalDue = toMoney(saleMetrics.totalDue);
  const totalExpenses = toMoney(expenseMetrics.totalExpenses);
  const refundedAmount = toMoney(returnMetrics.totalRefunded);
  const profit = toMoney((saleMetrics.totalProfit || 0) - totalExpenses - refundedAmount);

  return {
    sales: {
      totalSales: totalSalesValue,
      totalPaid,
      totalDue: Math.max(totalDue, 0),
      refundedAmount,
      profit
    },
    inventory: {
      totalPlantsAvailable: toMoney(inventoryMetrics.totalAvailablePlants),
      plantsSold: toMoney(saleMetrics.totalSoldPlants),
      plantsReturned: toMoney(returnMetrics.totalReturnedPlants || inventoryTxMetrics.plantsReturned),
      plantsDiscarded: toMoney(inventoryTxMetrics.plantsDiscarded)
    },
    seedLifecycle: {
      seedsPurchased: toMoney(seedPurchaseMetrics.seedsPurchased),
      seedsSown: toMoney(sowingMetrics.seedsSown),
      germinatedPlants: toMoney(sowingMetrics.germinatedPlants),
      discardedSeeds: toMoney(sowingMetrics.discardedSeeds)
    },
    customers: {
      totalCustomers: customerTotals[0] || 0,
      customersWithDues: customerDueCount,
      customersWithCompletedPayments: customerCompletedCount
    },
    staff: {
      analytics: staffAnalytics
    }
  };
};

const buildReportTables = async ({ nurseryId, startDate, endDate, staffId, plantTypeId, customerId }) => {
  const {
    saleFilter,
    paymentFilter,
    inventoryFilter
  } = getBaseFilters({ nurseryId, startDate, endDate });

  if (staffId) {
    saleFilter.performedBy = staffId;
    paymentFilter.verifiedBy = staffId;
  }
  if (customerId) {
    saleFilter.customer = customerId;
    paymentFilter.customerId = customerId;
  }

  const sales = await Sale.find(saleFilter)
    .populate("customer", "name")
    .populate({
      path: "items.inventory",
      populate: { path: "plantType", select: "name" }
    })
    .sort({ saleDate: -1 })
    .lean();

  const saleIds = sales.map((sale) => sale._id);
  if (saleIds.length) {
    paymentFilter.saleId = { $in: saleIds };
  }

  const payments = await Payment.find(paymentFilter).sort({ createdAt: -1 }).lean();

  const inventory = await PlantInventory.find(inventoryFilter)
    .populate("plantType", "name")
    .lean();

  const returns = await SaleReturn.find({
    saleId: { $in: saleIds.length ? saleIds : [null] },
    status: { $in: ["APPROVED", "COMPLETED"] }
  }).lean();

  const returnQtyBySaleItem = new Map();
  for (const row of returns) {
    const items = Array.isArray(row.itemsReturned) && row.itemsReturned.length
      ? row.itemsReturned
      : row.items || [];
    for (const item of items) {
      const key = String(item.saleItemId || "");
      returnQtyBySaleItem.set(key, (returnQtyBySaleItem.get(key) || 0) + Number(item.quantityReturned || 0));
    }
  }

  const salesTable = sales.map((sale) => ({
    saleId: sale.saleNumber || String(sale._id),
    customer: sale.customer?.name || "Walk-in",
    items: (sale.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    total: toMoney(sale.netAmount || sale.totalAmount),
    paid: toMoney(sale.paidAmount),
    due: toMoney(sale.dueAmount),
    status: sale.paymentStatus || "UNPAID"
  }));

  const paymentsTable = payments.map((payment) => ({
    paymentId: String(payment._id),
    sale: String(payment.saleId),
    amount: toMoney(payment.amount),
    mode: payment.mode,
    status: payment.status,
    date: payment.createdAt
  }));

  const inventorySummaryMap = new Map();
  for (const item of inventory) {
    const plantTypeIdKey = String(item.plantType?._id || item.plantType || "");
    if (plantTypeId && plantTypeIdKey !== plantTypeId) continue;
    const key = item.plantType?.name || "Unknown";
    if (!inventorySummaryMap.has(key)) {
      inventorySummaryMap.set(key, { plantType: key, available: 0, sold: 0, returned: 0 });
    }
    inventorySummaryMap.get(key).available += Number(item.quantity || 0);
  }

  for (const sale of sales) {
    for (const item of sale.items || []) {
      const itemPlantTypeId = String(item?.inventory?.plantType?._id || "");
      if (plantTypeId && itemPlantTypeId !== String(plantTypeId)) continue;
      const plantName = item?.inventory?.plantType?.name || "Unknown";
      if (!inventorySummaryMap.has(plantName)) {
        inventorySummaryMap.set(plantName, { plantType: plantName, available: 0, sold: 0, returned: 0 });
      }
      const soldQty = Number(item.quantity || 0);
      const returnedQty = returnQtyBySaleItem.get(String(item._id || "")) || 0;
      inventorySummaryMap.get(plantName).sold += soldQty;
      inventorySummaryMap.get(plantName).returned += returnedQty;
    }
  }

  const inventorySummaryTable = Array.from(inventorySummaryMap.values());

  const overview = await getAnalyticsOverview({ nurseryId, startDate, endDate });
  const staffAnalytics = overview;
  const staffPerformanceTable = (staffAnalytics.staff.analytics || []).map((row) => ({
    staff: row.staffName || row.staffUserId,
    salesCount: Number(row.salesMade || 0),
    collections: toMoney(row.collections || 0),
    expenses: toMoney(row.expensesRecorded || 0)
  }));

  return {
    overview,
    salesTable,
    paymentsTable,
    inventorySummaryTable,
    staffPerformanceTable
  };
};

const buildReportMeta = async ({ nurseryId, reportType, startDate, endDate, user }) => {
  const nursery = nurseryId ? await Nursery.findById(nurseryId).select("name") : null;
  const actor = user?.userId ? await User.findById(user.userId).select("name") : null;
  return [
    { label: "Nursery", value: nursery?.name || "All Nurseries" },
    { label: "Report Type", value: reportType || "SUMMARY" },
    { label: "Date Range", value: `${startDate || "Start"} to ${endDate || "Now"}` },
    { label: "Generated By", value: actor?.name || user?.userId || "System" }
  ];
};

const generateReportFile = async ({ format, metaRows, tables }) => {
  if (format === "PDF") {
    const buffer = await buildSimplePdfBuffer({
      title: "PNMS Report",
      metaRows,
      overview: tables.overview,
      sections: [
        { title: "Sales", headers: ["saleId", "customer", "items", "total", "paid", "due", "status"], rows: tables.salesTable },
        { title: "Payments", headers: ["paymentId", "sale", "amount", "mode", "status", "date"], rows: tables.paymentsTable },
        { title: "Inventory Summary", headers: ["plantType", "available", "sold", "returned"], rows: tables.inventorySummaryTable },
        { title: "Staff Performance", headers: ["staff", "salesCount", "collections", "expenses"], rows: tables.staffPerformanceTable }
      ]
    });
    return {
      buffer,
      mimeType: "application/pdf",
      extension: "pdf"
    };
  }

  const buffer = await buildExcelBuffer({
    sheets: [
      {
        name: "Sales",
        columns: [
          { header: "Sale ID", key: "saleId" },
          { header: "Customer", key: "customer" },
          { header: "Items", key: "items" },
          { header: "Total", key: "total" },
          { header: "Paid", key: "paid" },
          { header: "Due", key: "due" },
          { header: "Status", key: "status" }
        ],
        rows: tables.salesTable
      },
      {
        name: "Payments",
        columns: [
          { header: "Payment ID", key: "paymentId" },
          { header: "Sale", key: "sale" },
          { header: "Amount", key: "amount" },
          { header: "Mode", key: "mode" },
          { header: "Status", key: "status" },
          { header: "Date", key: "date" }
        ],
        rows: tables.paymentsTable
      },
      {
        name: "Inventory",
        columns: [
          { header: "Plant Type", key: "plantType" },
          { header: "Available", key: "available" },
          { header: "Sold", key: "sold" },
          { header: "Returned", key: "returned" }
        ],
        rows: tables.inventorySummaryTable
      },
      {
        name: "Staff",
        columns: [
          { header: "Staff", key: "staff" },
          { header: "Sales Count", key: "salesCount" },
          { header: "Collections", key: "collections" },
          { header: "Expenses", key: "expenses" }
        ],
        rows: tables.staffPerformanceTable
      }
    ]
  });

  return {
    buffer: Buffer.from(buffer),
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extension: "xlsx"
  };
};

const getStructuredReportData = async (params, user) => {
  const scopedNurseryId = applyNurseryScope(user, params.nurseryId);
  const reportType = REPORT_TYPES.has(params.reportType) ? params.reportType : "SALES";
  const tables = await buildReportTables({
    nurseryId: scopedNurseryId,
    startDate: params.startDate,
    endDate: params.endDate,
    staffId: params.staffId,
    plantTypeId: params.plantTypeId,
    customerId: params.customerId
  });
  const metaRows = await buildReportMeta({
    nurseryId: scopedNurseryId,
    reportType,
    startDate: params.startDate,
    endDate: params.endDate,
    user
  });

  return {
    reportType,
    metaRows,
    overview: tables.overview,
    tables: {
      sales: tables.salesTable,
      payments: tables.paymentsTable,
      inventory: tables.inventorySummaryTable,
      staff: tables.staffPerformanceTable
    }
  };
};

const exportReport = async (payload, user) => {
  const reportType = REPORT_TYPES.has(payload.reportType) ? payload.reportType : "SALES";
  const scopedNurseryId = applyNurseryScope(user, payload.nurseryId);
  const format = String(payload.format || "PDF").toUpperCase();
  const tables = await buildReportTables({
    nurseryId: scopedNurseryId,
    startDate: payload.startDate,
    endDate: payload.endDate,
    staffId: payload.staffId,
    plantTypeId: payload.plantTypeId,
    customerId: payload.customerId
  });
  const metaRows = await buildReportMeta({
    nurseryId: scopedNurseryId,
    reportType,
    startDate: payload.startDate,
    endDate: payload.endDate,
    user
  });

  const generated = await generateReportFile({ format, metaRows, tables });
  const fileName = `${reportType.toLowerCase()}_${Date.now()}.${generated.extension}`;

  return ReportJob.create({
    nurseryId: scopedNurseryId || null,
    reportType,
    filters: {
      nurseryId: payload.nurseryId || scopedNurseryId || null,
      startDate: payload.startDate || null,
      endDate: payload.endDate || null,
      staffId: payload.staffId || null,
      plantTypeId: payload.plantTypeId || null,
      customerId: payload.customerId || null
    },
    format,
    status: "READY",
    file: {
      name: fileName,
      mimeType: generated.mimeType,
      contentBase64: generated.buffer.toString("base64")
    },
    requestedBy: user.userId
  });
};

const getReportJob = async (id, user) => {
  const query = { _id: id };
  if (user.nurseryId) query.nurseryId = user.nurseryId;
  return ReportJob.findOne(query);
};

const downloadReportFile = async (params, user, format) => {
  const scopedNurseryId = applyNurseryScope(user, params.nurseryId);
  const tables = await buildReportTables({
    nurseryId: scopedNurseryId,
    startDate: params.startDate,
    endDate: params.endDate,
    staffId: params.staffId,
    plantTypeId: params.plantTypeId,
    customerId: params.customerId
  });
  const metaRows = await buildReportMeta({
    nurseryId: scopedNurseryId,
    reportType: params.reportType || "SUMMARY",
    startDate: params.startDate,
    endDate: params.endDate,
    user
  });
  const generated = await generateReportFile({ format, metaRows, tables });
  const fileName = `${String(params.reportType || "report").toLowerCase()}_${Date.now()}.${generated.extension}`;
  return {
    fileName,
    mimeType: generated.mimeType,
    buffer: generated.buffer
  };
};

module.exports = {
  exportReport,
  getReportJob,
  getAnalyticsOverview,
  getStructuredReportData,
  downloadReportFile
};
