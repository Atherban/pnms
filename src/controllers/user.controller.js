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
    const users = await userService.getUsers();
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
    const user = await userService.getUserById(req.params.id);
    res.status(statusCode.OK).json(user);
  } catch (err) {
    next(err);
  }
};

// Update user
const updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    res.status(statusCode.OK).json(user);
  } catch (err) {
    next(err);
  }
};

// Soft delete (disable) user
const disableUser = async (req, res, next) => {
  try {
    const user = await userService.disableUser(req.params.id);
    res.status(statusCode.OK).json(user);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  disableUser
};
