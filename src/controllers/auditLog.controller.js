const statusCode = require("../enums/statusCode");
const auditLogService = require("../services/auditLog.service");

const getSoftDeleteAuditLogs = async (req, res, next) => {
  try {
    const logs = await auditLogService.getSoftDeleteAuditLogs(req.user, req.query);
    res.status(statusCode.OK).json({
      message: "Soft delete audit logs retrieved successfully",
      data: logs
    });
  } catch (err) {
    next(err);
  }
};

const clearSoftDeleteAuditLogs = async (req, res, next) => {
  try {
    const result = await auditLogService.clearSoftDeleteAuditLogs(req.user, req.query);
    res.status(statusCode.OK).json({
      message: "Soft delete audit logs cleared successfully",
      data: result
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSoftDeleteAuditLogs,
  clearSoftDeleteAuditLogs
};
