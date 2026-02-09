const express = require("express");
const router = express.Router();

const inventoryController = require("../controllers/inventory.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");
const validate = require("../middlewares/validate.middleware");
const { objectIdSchema } = require("../validations/common.validation");

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "STAFF"),
  inventoryController.getInventory
);

router.get(
  "/:id",
  authenticate,
  authorize("ADMIN", "STAFF"),
  validate(objectIdSchema, "params"),
  inventoryController.getInventoryById
);

module.exports = router;
