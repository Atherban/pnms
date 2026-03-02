const AuditLog = require("../models/AuditLog.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");

const buildSoftDeleteAuditLogQuery = (user, filters = {}) => {
  const query = { action: "SOFT_DELETED" };

  if (user?.role === "SUPER_ADMIN") {
    if (filters.nurseryId) {
      query.nurseryId = filters.nurseryId;
    }
  } else if (user?.role === "NURSERY_ADMIN") {
    if (!user.nurseryId) {
      throw new ApiError(statusCode.FORBIDDEN, "User is not assigned to a nursery");
    }

    if (filters.nurseryId && String(filters.nurseryId) !== String(user.nurseryId)) {
      throw new ApiError(statusCode.FORBIDDEN, "Cannot access audit logs for another nursery");
    }

    query.nurseryId = user.nurseryId;
  } else {
    throw new ApiError(statusCode.FORBIDDEN, "Access denied");
  }

  if (filters.entityType) {
    query.entityType = filters.entityType;
  }

  if (filters.from || filters.to) {
    query.occurredAt = {};
    if (filters.from) {
      query.occurredAt.$gte = new Date(filters.from);
    }
    if (filters.to) {
      query.occurredAt.$lte = new Date(filters.to);
    }
  }

  return query;
};

const getSoftDeleteAuditLogs = async (user, filters = {}) => {
  const query = buildSoftDeleteAuditLogQuery(user, filters);

  return AuditLog.find(query)
    .populate("actorUserId", "name email role")
    .populate("nurseryId", "name code")
    .sort({ occurredAt: -1, createdAt: -1 });
};

const clearSoftDeleteAuditLogs = async (user, filters = {}) => {
  const query = buildSoftDeleteAuditLogQuery(user, filters);
  const result = await AuditLog.deleteMany(query);
  return { deletedCount: Number(result?.deletedCount || 0) };
};

module.exports = {
  getSoftDeleteAuditLogs,
  clearSoftDeleteAuditLogs
};
