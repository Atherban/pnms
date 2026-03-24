const express = require("express");
const router = express.Router();

const reportController = require("../controllers/report.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");
const validate = require("../middlewares/validate.middleware");
const { objectIdSchema } = require("../validations/common.validation");
const { exportReportSchema, analyticsQuerySchema } = require("../validations/report.validation");

router.post(
  "/export",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(exportReportSchema),
  reportController.exportReport
);

router.get(
  "/analytics",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(analyticsQuerySchema, "query"),
  reportController.getAnalytics
);

router.get(
  "/structured",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(analyticsQuerySchema, "query"),
  reportController.getStructuredReport
);

router.get(
  "/download/pdf",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(analyticsQuerySchema, "query"),
  reportController.downloadReportPdf
);

router.get(
  "/download/excel",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(analyticsQuerySchema, "query"),
  reportController.downloadReportExcel
);

router.get(
  "/:id/download",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(objectIdSchema, "params"),
  reportController.downloadReport
);

module.exports = router;
