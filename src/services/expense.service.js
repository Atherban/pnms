const Expense = require("../models/Expense.model");
const FinancialLedgerEntry = require("../models/FinancialLedgerEntry.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");
const { upsertStaffAccount } = require("./staffAccount.service");
const AuditLog = require("../models/AuditLog.model");

const buildExpenseAccessQuery = (user, options = {}) => {
  const query = {
    deletedAt: { $exists: false }
  };

  if (user?.role !== "SUPER_ADMIN" && user?.nurseryId) {
    query.nurseryId = user.nurseryId;
  }

  if (user?.role === "STAFF") {
    query.purchasedBy = user.userId;
    return query;
  }

  if (
    options?.staffUserId &&
    (user?.role === "NURSERY_ADMIN" || user?.role === "SUPER_ADMIN")
  ) {
    query.purchasedBy = options.staffUserId;
  }

  return query;
};

const createExpense = async (payload, user) => {
  const expense = await Expense.create({
    ...payload,
    nurseryId: user.nurseryId || null,
    purchasedBy: user.userId
  });

  await FinancialLedgerEntry.create({
    nurseryId: user.nurseryId || null,
    entryType: "EXPENSE_POSTED",
    referenceType: "Expense",
    referenceId: expense._id,
    debit: payload.amount,
    credit: 0,
    balanceImpact: -payload.amount,
    postedBy: user.userId,
    meta: { type: payload.type, purpose: payload.purpose || null }
  });

  await upsertStaffAccount({
    nurseryId: user.nurseryId || null,
    staffUserId: user.userId,
    staffRole: user.role,
    expensesDelta: payload.amount
  });

  await AuditLog.create({
    nurseryId: user.nurseryId || null,
    actorUserId: user.userId,
    action: "EXPENSE_CREATED",
    entityType: "Expense",
    entityId: expense._id,
    before: null,
    after: {
      amount: expense.amount,
      type: expense.type,
      date: expense.date,
      purpose: expense.purpose || null
    },
    occurredAt: new Date()
  });

  return expense;
};

const getExpenses = async (user, filters = {}) => {
  const query = buildExpenseAccessQuery(user, {
    staffUserId: filters?.staffUserId
  });

  return Expense.find(query)
    .populate("purchasedBy", "_id name role email phoneNumber")
    .sort({ date: -1, createdAt: -1 });
};

const getExpenseById = async (id, user) => {
  const expense = await Expense.findOne({
    _id: id,
    ...buildExpenseAccessQuery(user)
  }).populate("purchasedBy", "_id name role email phoneNumber");
  if (!expense || expense.deletedAt) {
    throw new ApiError(statusCode.NOT_FOUND, "Expense not found");
  }
  return expense;
};

const updateExpense = async (id, payload, user) => {
  const immutableFinancialFields = ["amount", "type", "date", "nurseryId", "purchasedBy"];
  const attemptedImmutableFieldUpdate = immutableFinancialFields.some((field) =>
    Object.prototype.hasOwnProperty.call(payload, field)
  );
  if (attemptedImmutableFieldUpdate) {
    throw new ApiError(
      statusCode.BAD_REQUEST,
      "Financial fields on expense are immutable. Create a new expense entry instead."
    );
  }

  const existing = await Expense.findOne({
    _id: id,
    ...buildExpenseAccessQuery(user)
  }).populate("purchasedBy", "_id name role email phoneNumber");
  if (!existing || existing.deletedAt) {
    throw new ApiError(statusCode.NOT_FOUND, "Expense not found");
  }

  const expense = await Expense.findOneAndUpdate(
    {
      _id: id,
      ...buildExpenseAccessQuery(user)
    },
    payload,
    {
      new: true,
      runValidators: true
    }
  ).populate("purchasedBy", "_id name role email phoneNumber");

  if (!expense || expense.deletedAt) {
    throw new ApiError(statusCode.NOT_FOUND, "Expense not found");
  }

  await AuditLog.create({
    nurseryId: expense.nurseryId || user.nurseryId || null,
    actorUserId: user.userId,
    action: "EXPENSE_UPDATED",
    entityType: "Expense",
    entityId: expense._id,
    before: {
      description: existing.description || null,
      purpose: existing.purpose || null,
      productDetails: existing.productDetails || null
    },
    after: {
      description: expense.description || null,
      purpose: expense.purpose || null,
      productDetails: expense.productDetails || null
    },
    occurredAt: new Date()
  });

  return expense;
};

const deleteExpense = async (id, user) => {
  if (user?.role === "STAFF") {
    throw new ApiError(
      statusCode.FORBIDDEN,
      "Staff cannot delete expenses. Contact admin if correction is needed."
    );
  }

  const expense = await Expense.findOne({
    _id: id,
    ...buildExpenseAccessQuery(user)
  }).populate("purchasedBy", "_id name role email phoneNumber");
  if (!expense || expense.deletedAt) {
    throw new ApiError(statusCode.NOT_FOUND, "Expense not found");
  }

  const deletionTime = new Date();
  expense.deletedAt = deletionTime;
  await expense.save();

  const expenseOwnerId =
    expense?.purchasedBy && typeof expense.purchasedBy === "object"
      ? expense.purchasedBy._id
      : expense?.purchasedBy;
  const expenseOwnerRole =
    expense?.purchasedBy && typeof expense.purchasedBy === "object"
      ? expense.purchasedBy.role
      : undefined;
  const amount = Math.max(0, Number(expense.amount || 0));

  await FinancialLedgerEntry.create({
    nurseryId: expense.nurseryId || user.nurseryId || null,
    entryType: "EXPENSE_POSTED",
    referenceType: "Expense",
    referenceId: expense._id,
    debit: 0,
    credit: amount,
    balanceImpact: amount,
    postedBy: user.userId,
    meta: {
      type: expense.type,
      purpose: expense.purpose || null,
      reversal: true,
      reversalReason: "EXPENSE_DELETED"
    }
  });

  await upsertStaffAccount({
    nurseryId: expense.nurseryId || user.nurseryId || null,
    staffUserId: expenseOwnerId,
    staffRole: expenseOwnerRole,
    expensesDelta: -amount
  });

  await AuditLog.create({
    nurseryId: expense.nurseryId || user.nurseryId || null,
    actorUserId: user.userId,
    action: "SOFT_DELETED",
    entityType: "Expense",
    entityId: expense._id,
    before: {
      amount: expense.amount,
      type: expense.type
    },
    after: {
      deletedAt: deletionTime
    },
    occurredAt: new Date()
  });

  return expense;
};

module.exports = {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense
};
