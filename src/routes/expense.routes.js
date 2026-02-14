const express = require("express");
const router = express.Router();

const expenseController = require("../controllers/expense.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");
const validate = require("../middlewares/validate.middleware");
const { objectIdSchema } = require("../validations/common.validation");
const {
  createExpenseSchema,
  updateExpenseSchema
} = require("../validations/expense.validation");

router.post(
  "/",
  authenticate,
  authorize("STAFF"),
  validate(createExpenseSchema),
  expenseController.createExpense
);

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "STAFF", "VIEWER"),
  expenseController.getExpenses
);

router.get(
  "/:id",
  authenticate,
  authorize("ADMIN", "STAFF", "VIEWER"),
  validate(objectIdSchema, "params"),
  expenseController.getExpenseById
);

router.patch(
  "/:id",
  authenticate,
  authorize("STAFF"),
  validate(objectIdSchema, "params"),
  validate(updateExpenseSchema),
  expenseController.updateExpense
);

router.delete(
  "/:id",
  authenticate,
  authorize("STAFF"),
  validate(objectIdSchema, "params"),
  expenseController.deleteExpense
);

module.exports = router;
