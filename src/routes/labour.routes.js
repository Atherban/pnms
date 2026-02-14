const express = require("express");
const router = express.Router();

const labourController = require("../controllers/labour.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");
const validate = require("../middlewares/validate.middleware");
const { objectIdSchema } = require("../validations/common.validation");
const {
  createLabourSchema,
  updateLabourSchema
} = require("../validations/labour.validation");

router.post(
  "/",
  authenticate,
  authorize("STAFF"),
  validate(createLabourSchema),
  labourController.createLabour
);

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "STAFF", "VIEWER"),
  labourController.getLabours
);

router.get(
  "/:id",
  authenticate,
  authorize("ADMIN", "STAFF", "VIEWER"),
  validate(objectIdSchema, "params"),
  labourController.getLabourById
);

router.patch(
  "/:id",
  authenticate,
  authorize("STAFF"),
  validate(objectIdSchema, "params"),
  validate(updateLabourSchema),
  labourController.updateLabour
);

router.delete(
  "/:id",
  authenticate,
  authorize("STAFF"),
  validate(objectIdSchema, "params"),
  labourController.deleteLabour
);

module.exports = router;
