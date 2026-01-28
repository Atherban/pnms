const express = require("express");
const router = express.Router();

const userController = require("../controllers/user.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");
const validate = require("../middlewares/validate.middleware");
const { objectIdSchema } = require("../validations/common.validation");
const {
  createUserSchema,
  updateUserSchema
} = require("../validations/user.validation");

// Create user
router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createUserSchema),
  userController.createUser
);

// Get all users
router.get(
  "/",
  authenticate,
  authorize("ADMIN"),
  userController.getUsers
);

// Get user by ID
router.get(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(objectIdSchema, "params"),
  userController.getUserById
);

// Update user
router.patch(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(objectIdSchema, "params"),
  validate(updateUserSchema),
  userController.updateUser
);

// Disable user
router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(objectIdSchema, "params"),
  userController.disableUser
);

module.exports = router;
