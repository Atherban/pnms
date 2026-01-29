const express = require("express");
const router = express.Router();

const profitController = require("../controllers/profit.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");
const validate = require("../middlewares/validate.middleware");
const { profitQuerySchema } = require("../validations/profit.validation");

// Get profit report (ADMIN only)
router.get(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(profitQuerySchema, "body"),
  profitController.getProfitReport
);

module.exports = router;
