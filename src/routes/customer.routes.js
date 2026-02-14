const express = require("express");
const router = express.Router();

const customerController = require("../controllers/customer.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");
const validate = require("../middlewares/validate.middleware");
const { objectIdSchema } = require("../validations/common.validation");
const {
  createCustomerSchema,
  updateCustomerSchema
} = require("../validations/customer.validation");

router.post(
  "/",
  authenticate,
  authorize("STAFF"),
  validate(createCustomerSchema),
  customerController.createCustomer
);

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "STAFF", "VIEWER"),
  customerController.getCustomers
);

router.get(
  "/:id",
  authenticate,
  authorize("ADMIN", "STAFF", "VIEWER"),
  validate(objectIdSchema, "params"),
  customerController.getCustomerById
);

router.patch(
  "/:id",
  authenticate,
  authorize("STAFF"),
  validate(objectIdSchema, "params"),
  validate(updateCustomerSchema),
  customerController.updateCustomer
);

router.delete(
  "/:id",
  authenticate,
  authorize("STAFF"),
  validate(objectIdSchema, "params"),
  customerController.deleteCustomer
);

module.exports = router;
