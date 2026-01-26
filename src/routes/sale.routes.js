const express = require("express");
const router = express.Router();

const saleController = require("../controllers/sale.controller");
const validate = require("../middlewares/validate.middleware");
const { createSaleSchema } = require("../validations/sale.validation");
const { objectIdSchema } = require("../validations/common.validation");

// create sale
router.post("/", validate(createSaleSchema), saleController.createSale);

// get all sales
router.get('/', saleController.getAllSales)

// get sale by id
router.get('/:id', validate(objectIdSchema, 'params'), saleController.getSalesById);

module.exports = router;
