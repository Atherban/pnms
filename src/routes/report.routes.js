const express = require("express");
const router = express.Router();

const reportController = require("../controllers/report.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");
const validate = require("../middlewares/validate.middleware");
const { objectIdSchema } = require("../validations/common.validation");
const { exportReportSchema } = require("../validations/report.validation");

router.post(
  "/export",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(exportReportSchema),
  reportController.exportReport
);

router.get(
  "/:id/download",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(objectIdSchema, "params"),
  reportController.downloadReport
);

module.exports = router;
