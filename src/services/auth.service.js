const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User.model");
const ApiError = require("../exceptions/ApiError");
const { normalizeRole } = require("../utils/role.util");
const { normalizePhoneNumber } = require("../utils/phone.util");
const { ensureCustomerProfileForUser } = require("./customer.service");

const signAuthToken = (user) => jwt.sign(
  {
    userId: user._id,
    role: normalizeRole(user.role),
    nurseryId: user.nurseryId || null,
    tokenVersion: 1
  },
  process.env.JWT_SECRET,
  { expiresIn: "1d" },
);

const login = async ({ email, phoneNumber, password }) => {
  const normalizedEmail = email ? String(email).toLowerCase() : null;
  const normalizedPhone = phoneNumber ? normalizePhoneNumber(phoneNumber) : null;

  const criteria = [];
  if (normalizedPhone) {
    criteria.push({ phoneNumber: normalizedPhone });
    criteria.push({ phoneNumber: phoneNumber });
  }
  if (normalizedEmail) {
    criteria.push({ email: normalizedEmail });
  }

  if (criteria.length === 0) {
    throw new ApiError(400, "email or phoneNumber is required");
  }

  const user = await User.findOne({ $or: criteria }).select("+password");
  if (!user) throw new ApiError(401, "Invalid credentials");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new ApiError(401, "Invalid credentials");

  if (!user.isActive) {
    throw new ApiError(403, "User account is disabled");
  }

  if (normalizeRole(user.role) === "CUSTOMER") {
    await ensureCustomerProfileForUser(user);
  }

  const token = signAuthToken(user);
  const userObject = user.toObject();
  delete userObject.password;

  return { token, user: userObject };
};

const changePassword = async ({ userId, currentPassword, newPassword }) => {
  const user = await User.findById(userId).select("+password");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new ApiError(400, "Current password is incorrect");
  }

  user.password = newPassword;
  user.mustChangePassword = false;
  await user.save();

  return {
    message: "Password changed successfully",
    token: signAuthToken(user)
  };
};

module.exports = {
  login,
  changePassword
};
