const express = require("express");
const router = express.Router();

const saleController = require("../controllers/sale.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");
const validate = require("../middlewares/validate.middleware");
const { createSaleSchema } = require("../validations/sale.validation");
const { objectIdSchema } = require("../validations/common.validation");

// Create sale
router.post(
  "/",
  authenticate,
  authorize("ADMIN", "STAFF"),
  validate(createSaleSchema),
  saleController.createSale
);

// Get all sales
router.get(
  "/",
  authenticate,
  authorize("ADMIN", "STAFF"),
  saleController.getAllSales
);

// Get sale by ID
router.get(
  "/:id",
  authenticate,
  authorize("ADMIN", "STAFF"),
  validate(objectIdSchema, "params"),
  saleController.getSaleById
);

module.exports = router;
