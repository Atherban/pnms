const express = require("express");
const router = express.Router();

const germinationController = require("../controllers/germination.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");
const validate = require("../middlewares/validate.middleware");
const { germinationSchema } = require("../validations/germination.validation");

// Create germination record
router.post(
  "/",
  authenticate,
  authorize("STAFF", "NURSERY_ADMIN", "SUPER_ADMIN"),
  validate(germinationSchema),
  germinationController.recordGermination
);

// Get all germination records
router.get(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN", "STAFF"),
  germinationController.getGerminations
);

module.exports = router;
