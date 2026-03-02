const express = require("express");
const router = express.Router();

const notificationController = require("../controllers/notification.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");
const validate = require("../middlewares/validate.middleware");
const {
  createNotificationSchema,
  markReadParamsSchema,
  dueReminderConfigSchema,
  notificationTestSchema
} = require("../validations/notification.validation");

router.post(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(createNotificationSchema),
  notificationController.createNotification
);

router.get(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN", "STAFF", "CUSTOMER"),
  notificationController.getNotifications
);

router.delete(
  "/clear-all",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN", "STAFF", "CUSTOMER"),
  notificationController.clearAll
);

router.patch(
  "/:id/read",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN", "STAFF", "CUSTOMER"),
  validate(markReadParamsSchema, "params"),
  notificationController.markRead
);

router.post(
  "/test",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(notificationTestSchema),
  notificationController.sendTestNotification
);

router.patch(
  "/due-reminder-config",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(dueReminderConfigSchema),
  notificationController.setDueReminderConfig
);

module.exports = router;
