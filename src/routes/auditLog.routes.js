const express = require("express");
const router = express.Router();

const auditLogController = require("../controllers/auditLog.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");

router.get(
  "/soft-deletes",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  auditLogController.getSoftDeleteAuditLogs
);

router.delete(
  "/soft-deletes",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  auditLogController.clearSoftDeleteAuditLogs
);

// Backward-compatible alias for clients still calling "/soft-deleted"
router.get(
  "/soft-deleted",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  auditLogController.getSoftDeleteAuditLogs
);

module.exports = router;
