const Sale = require("../models/Sale.model");
const Expense = require("../models/Expense.model");
const Labour = require("../models/Labour.model");
const ApiError = require("../exceptions/ApiError");

const calculateProfit = async (startDate, endDate) => {
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

  const dateFilter = {
    $gte: from,
    $lte: to
  };

  // 1. Total Sales Revenue
  const sales = await Sale.aggregate([
    { $match: { saleDate: dateFilter } },
    { $unwind: "$items" },
    {
      $group: {
        _id: null,
        totalSales: {
          $sum: {
            $multiply: ["$items.quantity", "$items.priceAtSale"]
          }
        }
      }
    }
  ]);

  const totalSales = sales[0]?.totalSales || 0;

  // 2. Expenses
  const expenses = await Expense.aggregate([
    { $match: { date: dateFilter } },
    {
      $group: {
        _id: null,
        totalExpenses: { $sum: "$amount" }
      }
    }
  ]);

  const totalExpenses = expenses[0]?.totalExpenses || 0;

  // 3. Labour Cost
  const labour = await Labour.aggregate([
    { $match: { date: dateFilter } },
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
  ]);

  const totalLabourCost = labour[0]?.totalLabourCost || 0;

  // 4. Net Profit
  const totalCost = totalExpenses + totalLabourCost;
  const netProfit = totalSales - totalCost;

  return {
    period: {
      startDate: from,
      endDate: to
    },
    totalSales,
    totalExpenses,
    totalLabourCost,
    totalCost,
    netProfit
  };
};

module.exports = {
  calculateProfit
};
