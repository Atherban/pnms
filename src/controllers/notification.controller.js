const statusCode = require("../enums/statusCode");
const notificationService = require("../services/notification.service");
const ApiError = require("../exceptions/ApiError");

const getNotifications = async (req, res, next) => {
  try {
    const notifications = await notificationService.getNotificationsForUser(req.user);
    res.status(statusCode.OK).json({
      message: "Notifications retrieved successfully",
      data: notifications
    });
  } catch (err) {
    next(err);
  }
};

const createNotification = async (req, res, next) => {
  try {
    const notification = await notificationService.createAdminNotification(req.body, req.user);
    res.status(statusCode.CREATED).json({
      message: "Notification sent successfully",
      data: notification
    });
  } catch (err) {
    next(err);
  }
};

const setDueReminderConfig = async (req, res, next) => {
  try {
    const result = await notificationService.setDueReminderConfig(req.user, req.body.everyDays);
    res.status(statusCode.OK).json({
      message: "Due reminder config updated",
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const markRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markNotificationRead(req.params.id, req.user);
    if (!notification) {
      throw new ApiError(statusCode.NOT_FOUND, "Notification not found");
    }
    res.status(statusCode.OK).json({
      message: "Notification marked as read",
      data: notification
    });
  } catch (err) {
    next(err);
  }
};

const clearAll = async (req, res, next) => {
  try {
    const result = await notificationService.clearNotificationsForUser(req.user);
    res.status(statusCode.OK).json({
      message: "Notifications cleared successfully",
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const sendTestNotification = async (req, res, next) => {
  try {
    const result = await notificationService.sendTestNotification({
      userId: req.body.userId,
      actor: req.user
    });
    res.status(statusCode.OK).json({
      message: "Test push notification sent",
      data: result
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createNotification,
  clearAll,
  getNotifications,
  markRead,
  setDueReminderConfig,
  sendTestNotification
};
