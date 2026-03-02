const statusCode = require("../enums/statusCode");
const userService = require("../services/user.service");

// Create user
const createUser = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body, req.user);
    res.status(statusCode.CREATED).json({
        message: "User created successfully",
        data: user
    });
  } catch (err) {
    next(err);
  }
};

// Get all users
const getUsers = async (req, res, next) => {
  try {
    const users = await userService.getUsers(req.user);
    res.status(statusCode.OK).json({
        message: "Users retrieved successfully",
        data: users
    });
  } catch (err) {
    next(err);
  }
};

// Get user by ID
const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id, req.user);
    res.status(statusCode.OK).json({
        message: "User retrieved successfully",
        data: user
    });
  } catch (err) {
    next(err);
  }
};

// Update user
const updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body, req.user);
    res.status(statusCode.OK).json({
        message: "User updated successfully",
        data: user
    });
  } catch (err) {
    next(err);
  }
};

// Soft delete (disable) user
const disableUser = async (req, res, next) => {
  try {
    const user = await userService.disableUser(req.params.id, req.user);
    res.status(statusCode.OK).json({
        message: "User disabled successfully",
        data: user
    });
  } catch (err) {
    next(err);
  }
};

const resetUserPassword = async (req, res, next) => {
  try {
    const data = await userService.resetUserPassword(
      req.params.id,
      req.user,
      req.body?.defaultPassword
    );
    res.status(statusCode.OK).json({
      message: "User password reset successfully",
      data
    });
  } catch (err) {
    next(err);
  }
};

const registerDeviceToken = async (req, res, next) => {
  try {
    const data = await userService.registerDeviceToken(req.user, req.body);
    console.log(
      "[push-token] registered",
      req.user?.userId,
      req.body?.token,
      data?.deviceTokensCount
    );
    res.status(statusCode.OK).json({
      message: "Device token registered successfully",
      data
    });
  } catch (err) {
    console.error("[push-token] registration failed:", err?.message);
    next(err);
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  disableUser,
  resetUserPassword,
  registerDeviceToken
};
