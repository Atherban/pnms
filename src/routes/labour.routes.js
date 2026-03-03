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
  authorize("STAFF", "NURSERY_ADMIN", "SUPER_ADMIN"),
  validate(createLabourSchema),
  labourController.createLabour
);

router.get(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN", "STAFF"),
  labourController.getLabours
);

router.get(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN", "STAFF"),
  validate(objectIdSchema, "params"),
  labourController.getLabourById
);

router.patch(
  "/:id",
  authenticate,
  authorize("STAFF", "NURSERY_ADMIN", "SUPER_ADMIN"),
  validate(objectIdSchema, "params"),
  validate(updateLabourSchema),
  labourController.updateLabour
);

router.delete(
  "/:id",
  authenticate,
  authorize("NURSERY_ADMIN", "SUPER_ADMIN"),
  validate(objectIdSchema, "params"),
  labourController.deleteLabour
);

module.exports = router;
