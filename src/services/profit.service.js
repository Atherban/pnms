const Sale = require("../models/Sale.model");
const Expense = require("../models/Expense.model");
const Labour = require("../models/Labour.model");
const ApiError = require("../exceptions/ApiError");

const toNumber = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const clamp = (value, min = 0, max = Number.POSITIVE_INFINITY) =>
  Math.min(Math.max(value, min), max);

const normalizeSaleFinancials = (sale = {}) => {
  const gross = Math.max(
    0,
    toNumber(sale.grossAmount || sale.totalAmount)
  );
  const discount = clamp(toNumber(sale.discountAmount), 0, gross);
  const net = Math.max(0, toNumber(sale.netAmount) || gross - discount);
  const paidRaw = Math.max(0, toNumber(sale.paidAmount));
  const dueRaw = Math.max(0, toNumber(sale.dueAmount));

  let paid = clamp(paidRaw || Math.max(0, net - dueRaw), 0, net);
  let due = clamp(dueRaw || Math.max(0, net - paid), 0, net);

  if (Math.abs(net - (paid + due)) > 0.01) {
    due = clamp(net - paid, 0, net);
  }

  return { gross, discount, net, paid, due };
};

const getScopedNurseryId = (authUser = {}, requestedNurseryId) => {
  if (authUser.role !== "SUPER_ADMIN") {
    return authUser.nurseryId || null;
  }
  return requestedNurseryId || authUser.nurseryId || null;
};

const calculateProfit = async (startDate, endDate, authUser = {}, requestedNurseryId) => {
  if (!startDate || !endDate) {
    throw new ApiError(400, "startDate and endDate are required");
  }

  const from = new Date(startDate);
  const to = new Date(endDate);

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    throw new ApiError(400, "Invalid date format");
  }

  if (from > to) {
    throw new ApiError(400, "startDate must be before endDate");
  }

  const fromDate = new Date(from);
  fromDate.setHours(0, 0, 0, 0);
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);

  const scopedNurseryId = getScopedNurseryId(authUser, requestedNurseryId);

  const dateFilter = {
    $gte: fromDate,
    $lte: toDate
  };

  const saleQuery = {
    saleDate: dateFilter,
    isVoided: { $ne: true }
  };
  const expenseQuery = {
    date: dateFilter,
    deletedAt: { $exists: false }
  };
  const labourQuery = {
    date: dateFilter
  };

  if (scopedNurseryId) {
    saleQuery.nurseryId = scopedNurseryId;
    expenseQuery.nurseryId = scopedNurseryId;
    labourQuery.nurseryId = scopedNurseryId;
  }

  const [sales, expenses, labour] = await Promise.all([
    Sale.find(saleQuery).select("grossAmount totalAmount discountAmount netAmount paidAmount dueAmount"),
    Expense.aggregate([
      { $match: expenseQuery },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: "$amount" }
        }
      }
    ]),
    Labour.aggregate([
      { $match: labourQuery },
      {
        $group: {
          _id: null,
          totalLabourCost: {
            $sum: {
              $cond: [
                { $ifNull: ["$wagePerDay", false] },
                "$wagePerDay",
                { $multiply: ["$hoursWorked", "$wagePerHour"] }
              ]
            }
          }
        }
      }
    ])
  ]);

  const salesSummary = sales.reduce(
    (acc, sale) => {
      const finance = normalizeSaleFinancials(sale);
      acc.totalGrossSales += finance.gross;
      acc.totalDiscount += finance.discount;
      acc.totalSales += finance.net;
      acc.totalCollected += finance.paid;
      acc.totalDue += finance.due;
      return acc;
    },
    {
      totalGrossSales: 0,
      totalDiscount: 0,
      totalSales: 0,
      totalCollected: 0,
      totalDue: 0
    }
  );

  const totalExpenses = expenses[0]?.totalExpenses || 0;

  const totalLabourCost = labour[0]?.totalLabourCost || 0;

  const totalCost = totalExpenses + totalLabourCost;
  const accruedProfit = salesSummary.totalSales - totalCost;
  const netProfit = salesSummary.totalCollected - totalCost;

  return {
    period: {
      startDate: fromDate,
      endDate: toDate
    },
    nurseryId: scopedNurseryId,
    totalGrossSales: salesSummary.totalGrossSales,
    totalDiscount: salesSummary.totalDiscount,
    totalSales: salesSummary.totalSales,
    totalCollected: salesSummary.totalCollected,
    totalDue: salesSummary.totalDue,
    totalExpenses,
    totalLabourCost,
    totalCost,
    accruedProfit,
    netProfit
  };
};

module.exports = {
  calculateProfit
};
