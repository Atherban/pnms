const express = require("express");
const router = express.Router();

const saleController = require("../controllers/sale.controller");
const saleReturnController = require("../controllers/saleReturn.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");
const validate = require("../middlewares/validate.middleware");
const { createSaleSchema } = require("../validations/sale.validation");
const { createSaleReturnSchema } = require("../validations/saleReturn.validation");
const { objectIdSchema } = require("../validations/common.validation");

// Create sale
router.post(
  "/",
  authenticate,
  authorize("STAFF", "NURSERY_ADMIN", "SUPER_ADMIN"),
  validate(createSaleSchema),
  saleController.createSale
);

router.post(
  "/:id/returns",
  authenticate,
  authorize("STAFF", "NURSERY_ADMIN", "SUPER_ADMIN"),
  validate(objectIdSchema, "params"),
  validate(createSaleReturnSchema),
  saleReturnController.createSaleReturn
);

// Get all sales
router.get(
  "/",
  authenticate,
  authorize("NURSERY_ADMIN", "STAFF", "CUSTOMER", "SUPER_ADMIN"),
  saleController.getAllSales
);

// Get sale by ID
router.get(
  "/:id",
  authenticate,
  authorize("NURSERY_ADMIN", "STAFF", "CUSTOMER", "SUPER_ADMIN"),
  validate(objectIdSchema, "params"),
  saleController.getSaleById
);

module.exports = router;
