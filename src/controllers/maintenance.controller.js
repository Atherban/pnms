const statusCode = require("../enums/statusCode");
const softDeleteRetentionService = require("../services/softDeleteRetention.service");

const purgeSoftDeleted = async (req, res, next) => {
  try {
    const payload = req.body || {};
    const scopedNurseryId = req.user?.role === "NURSERY_ADMIN"
      ? req.user.nurseryId
      : payload.nurseryId;

    const result = await softDeleteRetentionService.runSoftDeleteRetentionCleanup({
      retentionDays: payload.retentionDays,
      nurseryId: scopedNurseryId
    });

    res.status(statusCode.OK).json({
      message: "Soft delete cleanup completed",
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const listSoftDeletedItems = async (req, res, next) => {
  try {
    const result = await softDeleteRetentionService.listSoftDeletedItems(req.query || {});
    res.status(statusCode.OK).json({
      message: "Soft-deleted items retrieved successfully",
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const hardDeleteSoftDeletedItems = async (req, res, next) => {
  try {
    const result = await softDeleteRetentionService.hardDeleteSoftDeletedItems(req.body || {});
    res.status(statusCode.OK).json({
      message: "Selected soft-deleted items permanently deleted",
      data: result
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  purgeSoftDeleted,
  listSoftDeletedItems,
  hardDeleteSoftDeletedItems
};
