const Customer = require("../models/Customer.model");
const User = require("../models/User.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");
const { normalizePhoneNumber } = require("../utils/phone.util");
const AuditLog = require("../models/AuditLog.model");

const getPhoneVariants = (mobileNumber) => {
  const raw = String(mobileNumber || "").trim();
  const normalized = normalizePhoneNumber(raw);
  const digits = raw.replace(/\D/g, "");
  const last10 = digits.length >= 10 ? digits.slice(-10) : null;

  return [...new Set([
    raw,
    normalized,
    last10,
    last10 ? `+91${last10}` : null
  ].filter(Boolean))];
};

const ensureCustomerProfileForUser = async (customerUser) => {
  if (!customerUser || customerUser.role !== "CUSTOMER") {
    return null;
  }

  const nurseryFilter = customerUser.nurseryId ? { nurseryId: customerUser.nurseryId } : {};
  const normalizedMobile = customerUser.phoneNumber
    ? normalizePhoneNumber(customerUser.phoneNumber)
    : null;

  let profile = await Customer.findOne({
    userId: customerUser._id,
    ...nurseryFilter
  });

  if (!profile && normalizedMobile) {
    profile = await Customer.findOne({
      mobileNumber: normalizedMobile,
      deletedAt: { $exists: false },
      ...nurseryFilter
    });
  }

  if (profile) {
    const nextName = customerUser.name || profile.name;
    const nextMobile = normalizedMobile || profile.mobileNumber;
    const shouldRestore = !!profile.deletedAt;

    const needsUpdate =
      String(profile.userId || "") !== String(customerUser._id) ||
      profile.name !== nextName ||
      profile.mobileNumber !== nextMobile ||
      shouldRestore;

    if (needsUpdate) {
      profile.userId = customerUser._id;
      profile.name = nextName;
      profile.mobileNumber = nextMobile;
      profile.isActive = customerUser.isActive !== false;

      if (shouldRestore) {
        profile.deletedAt = undefined;
      }

      await profile.save();
    }

    return profile;
  }

  if (!normalizedMobile) {
    return null;
  }

  return Customer.create({
    nurseryId: customerUser.nurseryId || null,
    userId: customerUser._id,
    name: customerUser.name || "Customer",
    mobileNumber: normalizedMobile,
    isActive: customerUser.isActive !== false
  });
};

const syncCustomerProfilesForScope = async (user) => {
  const query = {
    role: "CUSTOMER",
    deletedAt: { $exists: false }
  };

  if (user?.role !== "SUPER_ADMIN" && user?.nurseryId) {
    query.nurseryId = user.nurseryId;
  }

  if (user?.role === "CUSTOMER") {
    query._id = user.userId;
  }

  const customerUsers = await User.find(query).select("_id role nurseryId name phoneNumber isActive");
  if (!customerUsers.length) return;

  await Promise.all(customerUsers.map((customerUser) => ensureCustomerProfileForUser(customerUser)));
};

const createCustomer = async (payload, user) => {
  const normalizedMobile = normalizePhoneNumber(payload.mobileNumber);
  const mobileVariants = getPhoneVariants(payload.mobileNumber);

  const exists = await Customer.findOne({
    mobileNumber: { $in: mobileVariants },
    ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {}),
    deletedAt: { $exists: false }
  });
  if (exists) {
    throw new ApiError(statusCode.CONFLICT, "Customer already exists");
  }

  let linkedCustomerUser = await User.findOne({
    phoneNumber: normalizedMobile,
    role: "CUSTOMER",
    ...(user?.nurseryId ? { nurseryId: user.nurseryId } : {})
  }).select("_id");

  if (!linkedCustomerUser && normalizedMobile) {
    linkedCustomerUser = await User.create({
      nurseryId: user?.nurseryId || null,
      name: payload.name || "Customer",
      phoneNumber: normalizedMobile,
      password: String(process.env.DEFAULT_USER_PASSWORD || "12345").trim(),
      role: "CUSTOMER",
      isActive: true,
      mustChangePassword: true,
      createdBy: user?.userId || undefined,
      updatedBy: user?.userId || undefined
    });
  }

  return Customer.create({
    userId: linkedCustomerUser?._id || payload.userId || undefined,
    ...payload,
    nurseryId: user?.nurseryId || null,
    mobileNumber: normalizedMobile
  });
};

const getCustomers = async (user) => {
  await syncCustomerProfilesForScope(user);

  const query = { deletedAt: { $exists: false } };
  if (user?.role !== "SUPER_ADMIN" && user?.nurseryId) {
    query.nurseryId = user.nurseryId;
  }
  if (user?.role === "CUSTOMER") {
    query.userId = user.userId;
  }
  return Customer.find(query).sort({ createdAt: -1 });
};

const getCustomerById = async (id, user) => {
  const customer = await Customer.findOne({
    _id: id,
    ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {})
  });
  if (!customer || customer.deletedAt) {
    throw new ApiError(statusCode.NOT_FOUND, "Customer not found");
  }
  if (user?.role === "CUSTOMER" && String(customer.userId) !== String(user.userId)) {
    throw new ApiError(statusCode.FORBIDDEN, "Access denied");
  }
  return customer;
};

const updateCustomer = async (id, payload, user) => {
  if (user?.role === "CUSTOMER") {
    const selfCustomer = await Customer.findOne({
      userId: user.userId,
      ...(user?.nurseryId ? { nurseryId: user.nurseryId } : {}),
      deletedAt: { $exists: false }
    });
    if (!selfCustomer || String(selfCustomer._id) !== String(id)) {
      throw new ApiError(statusCode.FORBIDDEN, "Access denied");
    }
  }

  if (payload.mobileNumber) {
    const mobileVariants = getPhoneVariants(payload.mobileNumber);

    const exists = await Customer.findOne({
      mobileNumber: { $in: mobileVariants },
      _id: { $ne: id },
      deletedAt: { $exists: false },
      ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {})
    });

    if (exists) {
      throw new ApiError(statusCode.CONFLICT, "Customer already exists");
    }

    payload.mobileNumber = normalizePhoneNumber(payload.mobileNumber);
  }

  const customer = await Customer.findOneAndUpdate({
    _id: id,
    ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {})
  }, payload, {
    new: true,
    runValidators: true
  });

  if (!customer || customer.deletedAt) {
    throw new ApiError(statusCode.NOT_FOUND, "Customer not found");
  }

  return customer;
};

const deleteCustomer = async (id, user) => {
  const customer = await Customer.findOneAndUpdate(
    {
      _id: id,
      ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {})
    },
    { deletedAt: new Date(), isActive: false },
    { new: true }
  );
  if (!customer) {
    throw new ApiError(statusCode.NOT_FOUND, "Customer not found");
  }

  await AuditLog.create({
    nurseryId: customer.nurseryId || user.nurseryId || null,
    actorUserId: user.userId,
    action: "SOFT_DELETED",
    entityType: "Customer",
    entityId: customer._id,
    before: {
      name: customer.name,
      isActive: true
    },
    after: {
      isActive: customer.isActive,
      deletedAt: customer.deletedAt
    },
    occurredAt: new Date()
  });

  return customer;
};

const getMyProfile = async (user) => {
  if (user?.role === "CUSTOMER") {
    const customerUser = await User.findById(user.userId).select("_id role nurseryId name phoneNumber isActive");
    if (customerUser) {
      await ensureCustomerProfileForUser(customerUser);
    }
  }

  const customer = await Customer.findOne({
    userId: user.userId,
    ...(user?.nurseryId ? { nurseryId: user.nurseryId } : {}),
    deletedAt: { $exists: false }
  });

  if (!customer) {
    throw new ApiError(statusCode.NOT_FOUND, "Customer profile not found");
  }

  return customer;
};

const updateMyProfile = async (user, payload) => {
  const customer = await Customer.findOne({
    userId: user.userId,
    ...(user?.nurseryId ? { nurseryId: user.nurseryId } : {}),
    deletedAt: { $exists: false }
  });

  if (!customer) {
    throw new ApiError(statusCode.NOT_FOUND, "Customer profile not found");
  }

  const updates = {};
  if (typeof payload.name === "string" && payload.name.trim()) {
    updates.name = payload.name.trim();
  }
  if (typeof payload.mobileNumber === "string" && payload.mobileNumber.trim()) {
    updates.phoneNumber = normalizePhoneNumber(payload.mobileNumber);
  }

  if (Object.keys(updates).length > 0) {
    if (updates.phoneNumber) {
      const existingUser = await User.findOne({
        _id: { $ne: user.userId },
        phoneNumber: updates.phoneNumber,
        deletedAt: { $exists: false }
      }).select("_id");

      if (existingUser) {
        throw new ApiError(statusCode.CONFLICT, "User already exists");
      }
    }
  }

  const updatedCustomer = await updateCustomer(customer._id, payload, user);

  if (Object.keys(updates).length > 0) {
    await User.findOneAndUpdate(
      {
        _id: user.userId,
        deletedAt: { $exists: false }
      },
      updates,
      { runValidators: true }
    );
  }

  return updatedCustomer;
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getMyProfile,
  updateMyProfile,
  ensureCustomerProfileForUser
};
