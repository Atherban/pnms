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
  authorize("STAFF", "NURSERY_ADMIN", "SUPER_ADMIN"),
  validate(createCustomerSchema),
  customerController.createCustomer
);

router.get(
  "/",
  authenticate,
  authorize("NURSERY_ADMIN", "STAFF", "CUSTOMER", "SUPER_ADMIN"),
  customerController.getCustomers
);

router.get(
  "/me/profile",
  authenticate,
  authorize("CUSTOMER"),
  customerController.getMyProfile
);

router.get(
  "/:id",
  authenticate,
  authorize("NURSERY_ADMIN", "STAFF", "CUSTOMER", "SUPER_ADMIN"),
  validate(objectIdSchema, "params"),
  customerController.getCustomerById
);

router.patch(
  "/me/profile",
  authenticate,
  authorize("CUSTOMER"),
  validate(updateCustomerSchema),
  customerController.updateMyProfile
);

router.patch(
  "/:id",
  authenticate,
  authorize("STAFF", "NURSERY_ADMIN", "SUPER_ADMIN", "CUSTOMER"),
  validate(objectIdSchema, "params"),
  validate(updateCustomerSchema),
  customerController.updateCustomer
);

router.delete(
  "/:id",
  authenticate,
  authorize("STAFF", "NURSERY_ADMIN", "SUPER_ADMIN"),
  validate(objectIdSchema, "params"),
  customerController.deleteCustomer
);

module.exports = router;
