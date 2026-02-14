const statusCode = require("../enums/statusCode");
const expenseService = require("../services/expense.service");

const createExpense = async (req, res, next) => {
  try {
    const expense = await expenseService.createExpense(req.body);
    res.status(statusCode.CREATED).json({
      message: "Expense created successfully",
      data: expense
    });
  } catch (err) {
    next(err);
  }
};

const getExpenses = async (req, res, next) => {
  try {
    const expenses = await expenseService.getExpenses();
    res.status(statusCode.OK).json({
      message: "Expenses retrieved successfully",
      data: expenses
    });
  } catch (err) {
    next(err);
  }
};

const getExpenseById = async (req, res, next) => {
  try {
    const expense = await expenseService.getExpenseById(req.params.id);
    res.status(statusCode.OK).json({
      message: "Expense retrieved successfully",
      data: expense
    });
  } catch (err) {
    next(err);
  }
};

const updateExpense = async (req, res, next) => {
  try {
    const expense = await expenseService.updateExpense(req.params.id, req.body);
    res.status(statusCode.OK).json({
      message: "Expense updated successfully",
      data: expense
    });
  } catch (err) {
    next(err);
  }
};

const deleteExpense = async (req, res, next) => {
  try {
    const expense = await expenseService.deleteExpense(req.params.id);
    res.status(statusCode.OK).json({
      message: "Expense deleted successfully",
      data: expense
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense
};
