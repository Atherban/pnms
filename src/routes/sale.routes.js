const express = require("express");
const router = express.Router();

const saleController = require("../controllers/sale.controller");
const validate = require("../middlewares/validate.middleware");
const { createSaleSchema } = require("../validations/sale.validation");

router.post("/", validate(createSaleSchema), saleController.createSale);

module.exports = router;
