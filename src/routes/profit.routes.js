const express = require("express");
const router = express.Router();

const profitController = require("../controllers/profit.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");
const validate = require("../middlewares/validate.middleware");
const { profitQuerySchema } = require("../validations/profit.validation");

// Get profit (ADMIN only)
router.get(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(profitQuerySchema, "query"),
  profitController.getProfit
);

module.exports = router;
