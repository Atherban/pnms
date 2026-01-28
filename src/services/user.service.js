const User = require("../models/User.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");

// Create user (ADMIN)
const createUser = async (data, adminUser) => {
  const existing = await User.findOne({ email: data.email });
  if (existing) {
    throw new ApiError(statusCode.BAD_REQUEST, "User already exists");
  }

  return User.create({
    ...data,
    createdBy: adminUser.userId
  });
};

// Get all users (ADMIN)
const getUsers = async () => {
  return User.find().select("-password");
};

// Get user by ID
const getUserById = async (userId) => {
  const user = await User.findById(userId).select("-password");
  if (!user) {
    throw new ApiError(statusCode.NOT_FOUND, "User not found");
  }
  return user;
};

// Update user
const updateUser = async (userId, data) => {
  const user = await User.findByIdAndUpdate(
    userId,
    data,
    { new: true, runValidators: true }
  ).select("-password");

  if (!user) {
    throw new ApiError(statusCode.NOT_FOUND, "User not found");
  }

  return user;
};

// Soft delete (disable)
const disableUser = async (userId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { isActive: false },
    { new: true }
  );

  if (!user) {
    throw new ApiError(statusCode.NOT_FOUND, "User not found");
  }

  return user;
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  disableUser
};
