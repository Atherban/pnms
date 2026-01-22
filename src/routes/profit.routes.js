const express = require("express");
const router = express.Router();

const profitController = require("../controllers/profit.controller");
const validate = require("../middlewares/validate.middleware");
const { profitQuerySchema } = require("../validations/profit.validation");

router.get(
  "/",
  validate(profitQuerySchema, "query"),
  profitController.getProfitReport
);

module.exports = router;
