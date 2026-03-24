const statusCode = require("../enums/statusCode");
const mongoose = require("mongoose");
const StaffAccount = require("../models/StaffAccount.model");
const Sale = require("../models/Sale.model");
const Expense = require("../models/Expense.model");
const User = require("../models/User.model");

const toNumber = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeSaleFinancials = (sale) => {
  const gross = Math.max(
    0,
    toNumber(sale?.grossAmount || sale?.totalAmount)
  );
  const discount = Math.max(0, Math.min(toNumber(sale?.discountAmount), gross));
  const revenue = Math.max(0, toNumber(sale?.netAmount) || gross - discount);
  let normalizedPaid = Math.max(0, Math.min(toNumber(sale?.paidAmount), revenue));
  let normalizedDue = Math.max(0, Math.min(toNumber(sale?.dueAmount), revenue));

  if (normalizedPaid <= 0 && normalizedDue > 0) {
    normalizedPaid = Math.max(0, revenue - normalizedDue);
  } else if (normalizedDue <= 0 && normalizedPaid > 0) {
    normalizedDue = Math.max(0, revenue - normalizedPaid);
  }

  // Keep financial summary consistent even when legacy rows store stale due values.
  if (Math.abs(revenue - (normalizedPaid + normalizedDue)) > 0.01) {
    normalizedDue = Math.max(0, revenue - normalizedPaid);
  }

  return {
    revenue,
    paid: Math.max(0, Math.min(normalizedPaid, revenue)),
    due: Math.max(0, Math.min(normalizedDue, revenue))
  };
};

const getStaffAccounts = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.nurseryId) {
      query.nurseryId = req.user.nurseryId;
    } else if (
      req.user.role === "SUPER_ADMIN" &&
      req.query.nurseryId &&
      mongoose.isValidObjectId(req.query.nurseryId)
    ) {
      query.nurseryId = req.query.nurseryId;
    }

    if (req.query.staffUserId && mongoose.isValidObjectId(req.query.staffUserId)) {
      query.staffUserId = req.query.staffUserId;
    }

    const accounts = await StaffAccount.find(query)
      .populate({
        path: "staffUserId",
        select: "name phoneNumber email role",
        match: { role: "STAFF" }
      })
      .sort({ periodStart: -1 });

    const decorated = await Promise.all(
      accounts
        .filter((account) => account?.staffUserId)
        .map(async (account) => {
        const saleQuery = {
          performedBy: account.staffUserId?._id || account.staffUserId,
          isVoided: { $ne: true },
          saleDate: {
            $gte: account.periodStart,
            $lte: account.periodEnd
          }
        };

        if (account.nurseryId) {
          saleQuery.nurseryId = account.nurseryId;
        }

        const expenseQuery = {
          purchasedBy: account.staffUserId?._id || account.staffUserId,
          deletedAt: { $exists: false },
          date: {
            $gte: account.periodStart,
            $lte: account.periodEnd
          }
        };
        if (account.nurseryId) {
          expenseQuery.nurseryId = account.nurseryId;
        }

        const [salesForPeriod, expenseTotals] = await Promise.all([
          Sale.find(saleQuery).select(
            "grossAmount totalAmount discountAmount netAmount paidAmount dueAmount"
          ),
          Expense.aggregate([
            { $match: expenseQuery },
            {
              $group: {
                _id: null,
                totalExpense: { $sum: "$amount" },
                expenseCount: { $sum: 1 }
              }
            }
          ])
        ]);

        const salesSummary = salesForPeriod.reduce(
          (acc, sale) => {
            const finance = normalizeSaleFinancials(sale);
            acc.salesAmount += finance.revenue;
            acc.collectedAmount += finance.paid;
            acc.dueAmount += finance.due;
            acc.salesCount += 1;
            if (finance.due > 0) acc.dueSalesCount += 1;
            return acc;
          },
          {
            salesAmount: 0,
            collectedAmount: 0,
            dueAmount: 0,
            salesCount: 0,
            dueSalesCount: 0
          }
        );

        const expenseSummary = expenseTotals[0] || { totalExpense: 0, expenseCount: 0 };
        const collectionsAmount = salesSummary.collectedAmount || 0;
        const expensesAmount = Number(expenseSummary.totalExpense || 0);
        const netBalance = collectionsAmount - expensesAmount;

        return {
          id: account._id,
          nurseryId: account.nurseryId,
          staffUserId: account.staffUserId?._id || null,
          staffName: account.staffUserId?.name || "Unknown",
          staffPhoneNumber: account.staffUserId?.phoneNumber || null,
          staffEmail: account.staffUserId?.email || null,
          staffRole: account.staffUserId?.role || null,
          periodStart: account.periodStart,
          periodEnd: account.periodEnd,
          salesAmount: salesSummary.salesAmount || 0,
          collectionsAmount,
          expensesAmount,
          netBalance,
          pendingDueAmount: salesSummary.dueAmount || 0,
          pendingDueSalesCount: salesSummary.dueSalesCount || 0,
          salesCount: salesSummary.salesCount || 0,
          expensesCount: expenseSummary.expenseCount || 0
        };
        })
    );

    res.status(statusCode.OK).json({
      message: "Staff accounts retrieved successfully",
      data: decorated
    });
  } catch (err) {
    next(err);
  }
};

const getStaffPerformance = async (req, res, next) => {
  try {
    const query = { isVoided: { $ne: true } };
    if (req.user.nurseryId) {
      query.nurseryId = req.user.nurseryId;
    } else if (
      req.user.role === "SUPER_ADMIN" &&
      req.query.nurseryId &&
      mongoose.isValidObjectId(req.query.nurseryId)
    ) {
      query.nurseryId = req.query.nurseryId;
    }

    if (req.query.staffUserId && mongoose.isValidObjectId(req.query.staffUserId)) {
      query.performedBy = req.query.staffUserId;
    }

    if (req.query.startDate || req.query.endDate) {
      const dateRange = {};
      if (req.query.startDate) dateRange.$gte = new Date(req.query.startDate);
      if (req.query.endDate) dateRange.$lte = new Date(req.query.endDate);
      query.$or = [{ saleDate: dateRange }, { createdAt: dateRange }];
    }

    const sales = await Sale.find(query)
      .populate("performedBy", "name email role")
      .select("performedBy roleAtTime grossAmount totalAmount discountAmount netAmount paidAmount dueAmount saleDate createdAt");

    const staffIds = [
      ...new Set(
        sales
          .map((sale) => String(sale?.performedBy?._id || sale?.performedBy || ""))
          .filter(Boolean)
      )
    ];
    const staffUsers = staffIds.length
      ? await User.find({ _id: { $in: staffIds } }).select("_id name email role")
      : [];
    const userMap = new Map(staffUsers.map((user) => [String(user._id), user]));

    const performanceMap = new Map();
    for (const sale of sales) {
      const performerId = String(sale?.performedBy?._id || sale?.performedBy || "");
      if (!performerId) continue;

      const performer = typeof sale?.performedBy === "object" ? sale.performedBy : userMap.get(performerId);
      const performerRole = String(
        performer?.role || sale?.roleAtTime || ""
      ).toUpperCase();
      if (performerRole !== "STAFF") continue;

      const finance = normalizeSaleFinancials(sale);
      if (!performanceMap.has(performerId)) {
        performanceMap.set(performerId, {
          staffId: performerId,
          staffName: performer?.name || "Unknown Staff",
          staffRole: performerRole,
          staffEmail: performer?.email || null,
          salesCount: 0,
          revenue: 0,
          collectedAmount: 0,
          dueAmount: 0
        });
      }

      const row = performanceMap.get(performerId);
      row.salesCount += 1;
      row.revenue += finance.revenue;
      row.collectedAmount += finance.paid;
      row.dueAmount += finance.due;
    }

    res.status(statusCode.OK).json({
      message: "Staff performance retrieved successfully",
      data: Array.from(performanceMap.values()).sort((a, b) => b.revenue - a.revenue)
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStaffAccounts,
  getStaffPerformance
};
