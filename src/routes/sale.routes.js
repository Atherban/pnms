const express = require("express");
const router = express.Router();

const saleController = require("../controllers/sale.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");
const validate = require("../middlewares/validate.middleware");
const { objectIdSchema } = require("../validations/common.validation");
const { createSaleSchema } = require("../validations/sale.validation");

// Create sale (ADMIN + STAFF)
router.post(
  "/",
  authenticate,
  authorize("ADMIN", "STAFF"),
  validate(createSaleSchema),
  saleController.createSale
);

// Get all sales (ADMIN only)
router.get(
  "/",
  authenticate,
  authorize("ADMIN"),
  saleController.getAllSales
);

// Get sale by ID (ADMIN only)
router.get(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(objectIdSchema, "params"),
  saleController.getSalesById
);

module.exports = router;
