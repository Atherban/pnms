const express = require("express");
const router = express.Router();

const staffAccountController = require("../controllers/staffAccount.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");

router.get(
  "/performance",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  staffAccountController.getStaffPerformance
);

router.get(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  staffAccountController.getStaffAccounts
);

module.exports = router;
