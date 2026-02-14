const Expense = require("../models/Expense.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");

const createExpense = async (payload) => {
  return Expense.create(payload);
};

const getExpenses = async () => {
  return Expense.find().sort({ date: -1, createdAt: -1 });
};

const getExpenseById = async (id) => {
  const expense = await Expense.findById(id);
  if (!expense) {
    throw new ApiError(statusCode.NOT_FOUND, "Expense not found");
  }
  return expense;
};

const updateExpense = async (id, payload) => {
  const expense = await Expense.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true
  });

  if (!expense) {
    throw new ApiError(statusCode.NOT_FOUND, "Expense not found");
  }

  return expense;
};

const deleteExpense = async (id) => {
  const expense = await Expense.findByIdAndDelete(id);
  if (!expense) {
    throw new ApiError(statusCode.NOT_FOUND, "Expense not found");
  }
  return expense;
};

module.exports = {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense
};
