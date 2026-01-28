const express = require("express");
const router = express.Router();

const germinationController = require("../controllers/germination.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");

// Create germination record
router.post(
  "/",
  authenticate,
  authorize("ADMIN", "STAFF"),
  germinationController.recordGermination
);

// Get all germination records
router.get(
  "/",
  authenticate,
  authorize("ADMIN"),
  germinationController.getGerminations
);

module.exports = router;
