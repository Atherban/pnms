const express = require("express");
const router = express.Router();

const userController = require("../controllers/user.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");
const validate = require("../middlewares/validate.middleware");
const { objectIdSchema } = require("../validations/common.validation");
const {
  createUserSchema,
  updateUserSchema,
  resetUserPasswordSchema,
  registerDeviceTokenSchema
} = require("../validations/user.validation");

// Create user
router.post(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(createUserSchema),
  userController.createUser
);

// Get all users
router.get(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  userController.getUsers
);

// Push token registration (before /:id routes to prevent param conflicts)
router.post(
  "/device-token",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN", "STAFF", "CUSTOMER"),
  validate(registerDeviceTokenSchema),
  userController.registerDeviceToken
);

router.post(
  "/push-token",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN", "STAFF", "CUSTOMER"),
  validate(registerDeviceTokenSchema),
  userController.registerDeviceToken
);

// Get user by ID
router.get(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(objectIdSchema, "params"),
  userController.getUserById
);

// Update user
router.patch(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(objectIdSchema, "params"),
  validate(updateUserSchema),
  userController.updateUser
);

// Disable user
router.delete(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(objectIdSchema, "params"),
  userController.disableUser
);

router.post(
  "/:id/reset-password",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(objectIdSchema, "params"),
  validate(resetUserPasswordSchema),
  userController.resetUserPassword
);

module.exports = router;
