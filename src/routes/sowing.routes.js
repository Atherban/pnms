const express = require("express");
const router = express.Router();

const sowingController = require("../controllers/sowing.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");
const validate = require("../middlewares/validate.middleware");
const { sowingSchema } = require("../validations/sowing.validation");

// Create sowing record
router.post(
  "/",
  authenticate,
  authorize("STAFF", "NURSERY_ADMIN", "SUPER_ADMIN"),
  validate(sowingSchema),
  sowingController.sowSeeds
);

// Get all sowing records
router.get(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN", "STAFF"),
  sowingController.getSowings
);

module.exports = router;
