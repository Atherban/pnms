const express = require("express");
const router = express.Router();

const inventoryController = require("../controllers/inventory.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");
const validate = require("../middlewares/validate.middleware");
const { objectIdSchema } = require("../validations/common.validation");
const {
  createPurchasedInventorySchema
} = require("../validations/inventory.validation");

router.post(
  "/",
  authenticate,
  authorize("STAFF", "NURSERY_ADMIN", "SUPER_ADMIN"),
  validate(createPurchasedInventorySchema),
  inventoryController.createInventory
);

router.get(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN", "STAFF", "CUSTOMER"),
  inventoryController.getInventory
);

router.get(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN", "STAFF", "CUSTOMER"),
  validate(objectIdSchema, "params"),
  inventoryController.getInventoryById
);

module.exports = router;
