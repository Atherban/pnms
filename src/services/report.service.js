const Sale = require("../models/Sale.model");
const Expense = require("../models/Expense.model");
const StaffAccount = require("../models/StaffAccount.model");
const PlantInventory = require("../models/PlantInventory.model");
const ReportJob = require("../models/ReportJob.model");

const toCsv = (rows) => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const body = rows.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(","));
  return [headers.join(","), ...body].join("\n");
};

const toPlainText = (rows) => {
  if (!rows.length) return "No data";
  const headers = Object.keys(rows[0]);
  return rows.map((row) => headers.map((h) => `${h}: ${row[h] ?? ""}`).join(" | ")).join("\n");
};

const toIso = (value) => (value instanceof Date ? value.toISOString() : value || "");
const toNum = (value) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const buildSalesRows = (sales) => sales.map((sale) => ({
  saleNumber: sale.saleNumber || "",
  saleDate: toIso(sale.saleDate),
  customerId: sale.customer?.toString?.() || "",
  grossAmount: toNum(sale.grossAmount || sale.totalAmount),
  netAmount: toNum(sale.netAmount || sale.totalAmount),
  paidAmount: toNum(sale.paidAmount),
  dueAmount: toNum(sale.dueAmount),
  paymentStatus: sale.paymentStatus || "",
  paymentMode: sale.paymentMode || "",
  performedBy: sale.performedBy?.name || ""
}));

const buildDueRows = (sales) => sales
  .filter((sale) => (sale.dueAmount || 0) > 0)
  .map((sale) => ({
    saleNumber: sale.saleNumber || "",
    dueAmount: sale.dueAmount || 0,
    paidAmount: sale.paidAmount || 0,
    totalAmount: sale.totalAmount || 0,
    paymentStatus: sale.paymentStatus || "",
    customerId: sale.customer?.toString?.() || "",
    paymentMode: sale.paymentMode || ""
  }));

const buildInventoryRows = (inventory) => inventory.map((item) => ({
  inventoryId: item._id?.toString?.() || "",
  plantType: item.plantType?.name || "",
  category: item.plantType?.category || "",
  variety: item.plantType?.variety || "",
  growthStage: item.growthStage || "",
  status: item.status || "",
  initialQuantity: toNum(item.initialQuantity),
  inStockQuantity: toNum(item.quantity),
  unitCost: toNum(item.unitCost),
  sourceType: item.sourceType || "",
  receivedAt: toIso(item.receivedAt)
}));

const buildExpenseRows = (expenses) => expenses.map((expense) => ({
  expenseId: expense._id?.toString?.() || "",
  date: toIso(expense.date),
  type: expense.type || "",
  purpose: expense.purpose || "",
  productDetails: expense.productDetails || "",
  amount: toNum(expense.amount),
  purchasedBy: expense.purchasedBy?.name || ""
}));

const buildStaffAccountingRows = (accounts) => accounts.map((account) => ({
  staffUserId: account.staffUserId?._id?.toString?.() || account.staffUserId?.toString?.() || "",
  staffName: account.staffUserId?.name || "",
  periodStart: toIso(account.periodStart),
  periodEnd: toIso(account.periodEnd),
  totalSalesAmount: toNum(account.totalSalesAmount),
  totalCollectedAmount: toNum(account.totalCollectedAmount),
  totalExpensesRecorded: toNum(account.totalExpensesRecorded),
  netAccountableBalance: toNum(account.netAccountableBalance)
}));

const buildProfitabilityRows = ({ sales, expenses }) => {
  const totalGrossSales = sales.reduce((sum, sale) => sum + toNum(sale.grossAmount || sale.totalAmount), 0);
  const totalNetSales = sales.reduce((sum, sale) => sum + toNum(sale.netAmount || sale.totalAmount), 0);
  const totalPaid = sales.reduce((sum, sale) => sum + toNum(sale.paidAmount), 0);
  const totalDue = sales.reduce((sum, sale) => sum + toNum(sale.dueAmount), 0);
  const totalSalesCost = sales.reduce((sum, sale) => sum + toNum(sale.totalCost), 0);
  const totalSalesProfit = sales.reduce((sum, sale) => sum + toNum(sale.totalProfit), 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + toNum(expense.amount), 0);
  const operationalProfit = totalSalesProfit - totalExpenses;
  const marginPercent = totalNetSales > 0
    ? Number(((operationalProfit / totalNetSales) * 100).toFixed(2))
    : 0;

  return [
    {
      totalGrossSales,
      totalNetSales,
      totalPaid,
      totalDue,
      totalSalesCost,
      totalSalesProfit,
      totalExpenses,
      operationalProfit,
      marginPercent
    }
  ];
};

const applyNurseryScope = (user, requestedNurseryId) => {
  if (user?.nurseryId) {
    return user.nurseryId;
  }
  if (user?.role === "SUPER_ADMIN" && requestedNurseryId) {
    return requestedNurseryId;
  }
  return null;
};

const exportReport = async (payload, user) => {
  const scopedNurseryId = applyNurseryScope(user, payload.nurseryId);

  const salesQuery = { isVoided: { $ne: true } };
  const expenseQuery = { deletedAt: { $exists: false } };
  const inventoryQuery = {};
  const staffAccountQuery = {};

  if (scopedNurseryId) {
    salesQuery.nurseryId = scopedNurseryId;
    expenseQuery.nurseryId = scopedNurseryId;
    inventoryQuery.nurseryId = scopedNurseryId;
    staffAccountQuery.nurseryId = scopedNurseryId;
  }

  if (payload.startDate || payload.endDate) {
    salesQuery.saleDate = {};
    expenseQuery.date = {};
    staffAccountQuery.periodStart = {};
    if (payload.startDate) {
      const startDate = new Date(payload.startDate);
      salesQuery.saleDate.$gte = startDate;
      expenseQuery.date.$gte = startDate;
      staffAccountQuery.periodStart.$gte = startDate;
    }
    if (payload.endDate) {
      const endDate = new Date(payload.endDate);
      salesQuery.saleDate.$lte = endDate;
      expenseQuery.date.$lte = endDate;
      staffAccountQuery.periodStart.$lte = endDate;
    }
  }

  const [sales, expenses, inventory, staffAccounts] = await Promise.all([
    Sale.find(salesQuery)
      .populate("performedBy", "name role")
      .sort({ saleDate: -1 }),
    Expense.find(expenseQuery)
      .populate("purchasedBy", "name role")
      .sort({ date: -1 }),
    PlantInventory.find(inventoryQuery)
      .populate("plantType", "name category variety")
      .sort({ receivedAt: -1 }),
    StaffAccount.find(staffAccountQuery)
      .populate("staffUserId", "name role")
      .sort({ periodStart: -1 })
  ]);

  let rows = [];
  if (payload.reportType === "SALES") {
    rows = buildSalesRows(sales);
  } else if (payload.reportType === "PAYMENT_DUES") {
    rows = buildDueRows(sales);
  } else if (payload.reportType === "INVENTORY") {
    rows = buildInventoryRows(inventory);
  } else if (payload.reportType === "STAFF_ACCOUNTING") {
    rows = buildStaffAccountingRows(staffAccounts);
  } else if (payload.reportType === "EXPENSES") {
    rows = buildExpenseRows(expenses);
  } else if (payload.reportType === "PROFITABILITY") {
    rows = buildProfitabilityRows({ sales, expenses });
  } else {
    rows = buildSalesRows(sales);
  }

  const bodyText = payload.format === "PDF" ? toPlainText(rows) : toCsv(rows);
  const ext = payload.format === "PDF" ? "txt" : "csv";
  const mimeType = payload.format === "PDF" ? "text/plain" : "text/csv";
  const fileName = `${payload.reportType.toLowerCase()}_${Date.now()}_${payload.format.toLowerCase()}.${ext}`;

  const reportJob = await ReportJob.create({
    nurseryId: scopedNurseryId || null,
    reportType: payload.reportType,
    filters: {
      nurseryId: payload.nurseryId || scopedNurseryId || null,
      startDate: payload.startDate || null,
      endDate: payload.endDate || null
    },
    format: payload.format,
    status: "READY",
    file: {
      name: fileName,
      mimeType,
      contentBase64: Buffer.from(bodyText, "utf-8").toString("base64")
    },
    requestedBy: user.userId
  });

  return reportJob;
};

const getReportJob = async (id, user) => {
  const query = { _id: id };
  if (user.nurseryId) query.nurseryId = user.nurseryId;
  return ReportJob.findOne(query);
};

module.exports = {
  exportReport,
  getReportJob
};
