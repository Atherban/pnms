const User = require("../models/User.model");
const Nursery = require("../models/Nursery.model");
const Customer = require("../models/Customer.model");
const Expense = require("../models/Expense.model");
const PlantType = require("../models/PlantType.model");
const Seed = require("../models/Seed.model");
const AuditLog = require("../models/AuditLog.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const SUPPORTED_SOFT_DELETE_COLLECTIONS = [
  "users",
  "nurseries",
  "customers",
  "expenses",
  "plantTypes",
  "seeds"
];

const getCollectionConfig = (collection) => {
  switch (collection) {
    case "users":
      return {
        model: User,
        query: (params = {}) => ({
          ...(params.nurseryId ? { nurseryId: params.nurseryId } : {}),
          deletedAt: { $exists: true }
        })
      };
    case "nurseries":
      return {
        model: Nursery,
        query: (params = {}) => ({
          ...(params.nurseryId ? { _id: params.nurseryId } : {}),
          deletedAt: { $exists: true }
        })
      };
    case "customers":
      return {
        model: Customer,
        query: (params = {}) => ({
          ...(params.nurseryId ? { nurseryId: params.nurseryId } : {}),
          deletedAt: { $exists: true }
        })
      };
    case "expenses":
      return {
        model: Expense,
        query: (params = {}) => ({
          ...(params.nurseryId ? { nurseryId: params.nurseryId } : {}),
          deletedAt: { $exists: true }
        })
      };
    case "plantTypes":
      return {
        model: PlantType,
        query: (params = {}) => ({
          ...(params.nurseryId ? { nurseryId: params.nurseryId } : {}),
          deletedAt: { $exists: true }
        })
      };
    case "seeds":
      return {
        model: Seed,
        query: (params = {}) => ({
          ...(params.nurseryId ? { nurseryId: params.nurseryId } : {}),
          isDeleted: true
        })
      };
    default:
      return null;
  }
};

const getEntityTypeForCollection = (collection) => {
  switch (collection) {
    case "users":
      return "User";
    case "nurseries":
      return "Nursery";
    case "customers":
      return "Customer";
    case "expenses":
      return "Expense";
    case "plantTypes":
      return "PlantType";
    case "seeds":
      return "Seed";
    default:
      return null;
  }
};

const buildEntityLabel = (row = {}) =>
  row.name ||
  row.title ||
  row.code ||
  row.email ||
  row.phoneNumber ||
  row.seedName ||
  row.variety ||
  row._id;

const getCutoffDate = (retentionDays = 30) => {
  const safeDays = Number.isFinite(Number(retentionDays)) && Number(retentionDays) > 0
    ? Number(retentionDays)
    : 30;
  return new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
};

const runSoftDeleteRetentionCleanup = async (params = {}) => {
  const cutoff = getCutoffDate(params.retentionDays);
  const nurseryFilter = params.nurseryId ? { nurseryId: params.nurseryId } : {};

  const [
    usersResult,
    nurseriesResult,
    customersResult,
    expensesResult,
    plantTypesResult,
    seedsResult,
    auditLogsResult,
  ] = await Promise.all([
    User.deleteMany({ ...nurseryFilter, deletedAt: { $lte: cutoff } }),
    Nursery.deleteMany({
      ...(params.nurseryId ? { _id: params.nurseryId } : {}),
      deletedAt: { $lte: cutoff }
    }),
    Customer.deleteMany({ ...nurseryFilter, deletedAt: { $lte: cutoff } }),
    Expense.deleteMany({ ...nurseryFilter, deletedAt: { $lte: cutoff } }),
    PlantType.deleteMany({ ...nurseryFilter, deletedAt: { $lte: cutoff } }),
    Seed.deleteMany({
      ...nurseryFilter,
      isDeleted: true,
      $or: [
        { deletedAt: { $lte: cutoff } },
        { deletedAt: { $exists: false }, updatedAt: { $lte: cutoff } }
      ]
    }),
    AuditLog.deleteMany({
      ...nurseryFilter,
      action: "SOFT_DELETED",
      occurredAt: { $lte: cutoff },
    }),
  ]);

  return {
    users: usersResult.deletedCount || 0,
    nurseries: nurseriesResult.deletedCount || 0,
    customers: customersResult.deletedCount || 0,
    expenses: expensesResult.deletedCount || 0,
    plantTypes: plantTypesResult.deletedCount || 0,
    seeds: seedsResult.deletedCount || 0,
    auditLogs: auditLogsResult.deletedCount || 0,
  };
};

const startSoftDeleteRetentionJob = () => {
  const runCleanup = async () => {
    try {
      const result = await runSoftDeleteRetentionCleanup();
      console.log("[soft-delete-cleanup] completed", result);
    } catch (err) {
      console.error("[soft-delete-cleanup] failed", err.message);
    }
  };

  runCleanup();
  return setInterval(runCleanup, CLEANUP_INTERVAL_MS);
};

const listSoftDeletedItems = async (params = {}) => {
  const limit = Math.max(1, Math.min(Number(params.limit) || 100, 500));
  const targets = params.collection
    ? [params.collection]
    : SUPPORTED_SOFT_DELETE_COLLECTIONS;

  const results = await Promise.all(
    targets.map(async (collection) => {
      const config = getCollectionConfig(collection);
      if (!config) {
        throw new ApiError(statusCode.BAD_REQUEST, `Unsupported collection: ${collection}`);
      }
      const rows = await config.model.find(config.query(params))
        .sort({ deletedAt: -1, updatedAt: -1, createdAt: -1 })
        .limit(limit)
        .lean();

      return rows.map((row) => ({
        id: String(row._id),
        collection,
        nurseryId: row.nurseryId ? String(row.nurseryId) : undefined,
        deletedAt: row.deletedAt || row.updatedAt || row.createdAt,
        entityLabel: buildEntityLabel(row),
        raw: row
      }));
    })
  );

  return results.flat().sort((a, b) => {
    const aTime = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
    const bTime = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
    return bTime - aTime;
  });
};

const hardDeleteSoftDeletedItems = async (params = {}) => {
  const config = getCollectionConfig(params.collection);
  if (!config) {
    throw new ApiError(statusCode.BAD_REQUEST, `Unsupported collection: ${params.collection}`);
  }

  const ids = Array.isArray(params.ids)
    ? params.ids.map((id) => String(id)).filter(Boolean)
    : [];
  if (!ids.length) {
    throw new ApiError(statusCode.BAD_REQUEST, "At least one id is required");
  }

  const deleteQuery = {
    ...config.query(params),
    _id: { $in: ids }
  };

  const result = await config.model.deleteMany(deleteQuery);

  const entityType = getEntityTypeForCollection(params.collection);
  if (entityType) {
    await AuditLog.deleteMany({
      ...(params.nurseryId ? { nurseryId: params.nurseryId } : {}),
      action: "SOFT_DELETED",
      entityType,
      entityId: { $in: ids },
    });
  }

  return {
    collection: params.collection,
    requested: ids.length,
    deleted: result.deletedCount || 0
  };
};

module.exports = {
  runSoftDeleteRetentionCleanup,
  startSoftDeleteRetentionJob,
  listSoftDeletedItems,
  hardDeleteSoftDeletedItems,
  SUPPORTED_SOFT_DELETE_COLLECTIONS
};
