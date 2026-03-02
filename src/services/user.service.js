const User = require("../models/User.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");
const { normalizeRole } = require("../utils/role.util");
const { normalizePhoneNumber } = require("../utils/phone.util");
const AuditLog = require("../models/AuditLog.model");
const { ensureCustomerProfileForUser } = require("./customer.service");
const { isValidExpoPushToken } = require("./push.service");

const USER_LIST_SELECT = "-password";
const USER_POPULATION = [
  { path: "createdBy", select: "name email role phoneNumber" },
  { path: "updatedBy", select: "name email role phoneNumber" },
  { path: "nurseryId", select: "name code status" }
];

const ensurePushTokenFieldsForAllUsers = async () => {
  const ensureDeviceTokensResult = await User.updateMany(
    { deviceTokens: { $exists: false } },
    { $set: { deviceTokens: [] } }
  );
  const removeLegacyPushTokensResult = await User.updateMany(
    { pushTokens: { $exists: true } },
    { $unset: { pushTokens: "" } }
  );

  return {
    matchedCount:
      Number(ensureDeviceTokensResult?.matchedCount || 0) +
      Number(removeLegacyPushTokensResult?.matchedCount || 0),
    modifiedCount:
      Number(ensureDeviceTokensResult?.modifiedCount || 0) +
      Number(removeLegacyPushTokensResult?.modifiedCount || 0)
  };
};

// Create user (ADMIN)
const createUser = async (data, adminUser) => {
  const role = normalizeRole(data.role);
  if (!data.email && !data.phoneNumber) {
    throw new ApiError(statusCode.BAD_REQUEST, "Either email or phoneNumber is required");
  }

  const preparedData = { ...data };
  if (role === "CUSTOMER" && !preparedData.password) {
    preparedData.password = "12345";
    preparedData.mustChangePassword = true;
  }

  if (adminUser.role === "NURSERY_ADMIN") {
    if (role === "SUPER_ADMIN") {
      throw new ApiError(statusCode.FORBIDDEN, "NURSERY_ADMIN cannot create SUPER_ADMIN");
    }
    preparedData.nurseryId = adminUser.nurseryId;
  }

  if (preparedData.email) {
    const existingByEmail = await User.findOne({ email: preparedData.email.toLowerCase() });
    if (existingByEmail) {
      throw new ApiError(statusCode.BAD_REQUEST, "User already exists with this email");
    }
  }

  if (preparedData.phoneNumber) {
    preparedData.phoneNumber = normalizePhoneNumber(preparedData.phoneNumber);
    const existingByPhone = await User.findOne({ phoneNumber: preparedData.phoneNumber });
    if (existingByPhone) {
      throw new ApiError(statusCode.BAD_REQUEST, "User already exists with this phone number");
    }
  }

  const user = await User.create({
    ...preparedData,
    role,
    email: preparedData.email ? preparedData.email.toLowerCase() : undefined,
    createdBy: adminUser.userId
  });

  let createdUser = await User.findById(user._id)
    .select(USER_LIST_SELECT)
    .populate(USER_POPULATION);

  if (role === "CUSTOMER") {
    await ensureCustomerProfileForUser(createdUser);
    createdUser = await User.findById(user._id)
      .select(USER_LIST_SELECT)
      .populate(USER_POPULATION);
  }

  return createdUser;
};

// Get all users (ADMIN)
const getUsers = async (actorUser) => {
  const query = { deletedAt: { $exists: false } };
  if (actorUser?.role === "NURSERY_ADMIN" && actorUser?.nurseryId) {
    query.nurseryId = actorUser.nurseryId;
  }

  return User.find(query)
    .select(USER_LIST_SELECT)
    .populate(USER_POPULATION);
};

// Get user by ID
const getUserById = async (userId, actorUser) => {
  const query = { _id: userId };
  if (actorUser?.role === "NURSERY_ADMIN" && actorUser?.nurseryId) {
    query.nurseryId = actorUser.nurseryId;
  }

  const user = await User.findOne(query)
    .select(USER_LIST_SELECT)
    .populate(USER_POPULATION);
  if (!user || user.deletedAt) {
    throw new ApiError(statusCode.NOT_FOUND, "User not found");
  }
  return user;
};

// Update user
const updateUser = async (userId, data, actorUser) => {
  const query = { _id: userId };
  if (actorUser?.role === "NURSERY_ADMIN" && actorUser?.nurseryId) {
    query.nurseryId = actorUser.nurseryId;
  }

  if (data.role) {
    data.role = normalizeRole(data.role);

    if (actorUser?.role === "NURSERY_ADMIN" && data.role === "SUPER_ADMIN") {
      throw new ApiError(statusCode.FORBIDDEN, "NURSERY_ADMIN cannot assign SUPER_ADMIN role");
    }
  }
  if (data.phoneNumber) {
    data.phoneNumber = normalizePhoneNumber(data.phoneNumber);
  }
  data.updatedBy = actorUser?.userId || data.updatedBy;

  const user = await User.findOneAndUpdate(
    query,
    data,
    { new: true, runValidators: true }
  )
    .select(USER_LIST_SELECT)
    .populate(USER_POPULATION);

  if (!user || user.deletedAt) {
    throw new ApiError(statusCode.NOT_FOUND, "User not found");
  }

  return user;
};

// Soft delete (disable)
const disableUser = async (userId, actorUser) => {
  const query = { _id: userId };
  if (actorUser?.role === "NURSERY_ADMIN" && actorUser?.nurseryId) {
    query.nurseryId = actorUser.nurseryId;
  }

  const user = await User.findOneAndUpdate(
    query,
    {
      isActive: false,
      deletedAt: new Date(),
      deletedBy: actorUser?.userId || undefined,
      updatedBy: actorUser?.userId || undefined
    },
    { new: true }
  )
    .select(USER_LIST_SELECT)
    .populate(USER_POPULATION);

  if (!user) {
    throw new ApiError(statusCode.NOT_FOUND, "User not found");
  }

  await AuditLog.create({
    nurseryId: user.nurseryId || actorUser?.nurseryId || null,
    actorUserId: actorUser?.userId,
    action: "SOFT_DELETED",
    entityType: "User",
    entityId: user._id,
    before: { isActive: true },
    after: { isActive: false, deletedAt: user.deletedAt },
    occurredAt: new Date()
  });

  return user;
};

const resetUserPassword = async (userId, actorUser, defaultPasswordInput) => {
  const query = { _id: userId };
  if (actorUser?.role === "NURSERY_ADMIN") {
    if (!actorUser?.nurseryId) {
      throw new ApiError(statusCode.FORBIDDEN, "NURSERY_ADMIN is not assigned to a nursery");
    }
    query.nurseryId = actorUser.nurseryId;
  }

  const user = await User.findOne(query).select("+password");
  if (!user || user.deletedAt) {
    throw new ApiError(statusCode.NOT_FOUND, "User not found");
  }

  if (actorUser?.role === "NURSERY_ADMIN" && user.role === "SUPER_ADMIN") {
    throw new ApiError(statusCode.FORBIDDEN, "NURSERY_ADMIN cannot reset SUPER_ADMIN password");
  }

  const defaultPassword = String(
    defaultPasswordInput || process.env.DEFAULT_USER_PASSWORD || "12345"
  ).trim();

  user.password = defaultPassword;
  user.mustChangePassword = true;
  user.updatedBy = actorUser?.userId;
  await user.save();

  await AuditLog.create({
    nurseryId: user.nurseryId || actorUser?.nurseryId || null,
    actorUserId: actorUser?.userId,
    action: "USER_PASSWORD_RESET",
    entityType: "User",
    entityId: user._id,
    before: { mustChangePassword: false },
    after: { mustChangePassword: true },
    occurredAt: new Date()
  });

  const sanitizedUser = await User.findById(user._id)
    .select(USER_LIST_SELECT)
    .populate(USER_POPULATION);

  return {
    user: sanitizedUser,
    defaultPassword
  };
};

const registerDeviceToken = async (actorUser, payload) => {
  const token = String(payload?.token || "").trim();
  if (!isValidExpoPushToken(token)) {
    throw new ApiError(statusCode.BAD_REQUEST, "Invalid Expo push token");
  }

  const actorId = String(actorUser?.userId || "").trim();
  if (!actorId) {
    throw new ApiError(statusCode.UNAUTHORIZED, "Invalid authenticated user");
  }

  const existingUser = await User.findById(actorId).select("_id");
  if (!existingUser) {
    throw new ApiError(statusCode.NOT_FOUND, "Authenticated user not found");
  }

  console.log("Registering push token for user:", actorId, token);

  const platform = ["ios", "android", "web"].includes(payload?.platform)
    ? payload.platform
    : "unknown";
  const appOwnership = payload?.appOwnership
    ? String(payload.appOwnership).trim()
    : undefined;
  const deviceName = payload?.deviceName
    ? String(payload.deviceName).trim()
    : undefined;
  const now = new Date();

  // Ensure one token maps to one active user record, even after logout/login switches.
  await User.updateMany(
    { _id: { $ne: actorId } },
    {
      $pull: {
        deviceTokens: { token }
      }
    }
  );

  const cleanupResult = await User.updateOne(
    { _id: actorId },
    {
      $pull: { deviceTokens: { token } }
    }
  );

  if (!cleanupResult?.matchedCount) {
    throw new ApiError(statusCode.NOT_FOUND, "User not found while saving push token");
  }

  const pushResult = await User.updateOne(
    { _id: actorId },
    {
      $push: {
        deviceTokens: {
          token,
          platform,
          appOwnership,
          deviceName,
          lastSeenAt: now
        }
      }
    }
  );

  if (!pushResult?.matchedCount) {
    throw new ApiError(statusCode.NOT_FOUND, "User not found while saving device token");
  }

  const updatedUser = await User.findById(actorId).select("deviceTokens");

  return {
    registered: true,
    token,
    deviceTokensCount: Array.isArray(updatedUser?.deviceTokens)
      ? updatedUser.deviceTokens.length
      : 0
  };
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  disableUser,
  resetUserPassword,
  registerDeviceToken,
  ensurePushTokenFieldsForAllUsers
};
