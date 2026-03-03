const express = require("express");

const router = express.Router();
const customerSeedBatchController = require("../controllers/customerSeedBatch.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");
const validate = require("../middlewares/validate.middleware");
const { objectIdSchema } = require("../validations/common.validation");
const {
  createCustomerSeedBatchSchema,
  updateCustomerSeedBatchSchema
} = require("../validations/customerSeedBatch.validation");

router.post(
  "/",
  authenticate,
  authorize("STAFF", "NURSERY_ADMIN", "SUPER_ADMIN"),
  validate(createCustomerSeedBatchSchema),
  customerSeedBatchController.createCustomerSeedBatch
);

router.get(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN", "STAFF", "CUSTOMER"),
  customerSeedBatchController.getCustomerSeedBatches
);

router.get(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN", "STAFF", "CUSTOMER"),
  validate(objectIdSchema, "params"),
  customerSeedBatchController.getCustomerSeedBatchById
);

router.patch(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN", "STAFF"),
  validate(objectIdSchema, "params"),
  validate(updateCustomerSeedBatchSchema),
  customerSeedBatchController.updateCustomerSeedBatch
);

router.post(
  "/:id/mark-ready",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN", "STAFF"),
  validate(objectIdSchema, "params"),
  customerSeedBatchController.markReadyCustomerSeedBatch
);

router.post(
  "/:id/collect",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN", "STAFF"),
  validate(objectIdSchema, "params"),
  customerSeedBatchController.collectCustomerSeedBatch
);

module.exports = router;
