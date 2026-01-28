const express = require("express");
const router = express.Router();

const sowingController = require("../controllers/sowing.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");

// Create sowing record
router.post(
  "/",
  authenticate,
  authorize("ADMIN", "STAFF"),
  sowingController.sowSeeds
);

// Get all sowing records
router.get(
  "/",
  authenticate,
  authorize("ADMIN"),
  sowingController.getSowings
);

module.exports = router;
