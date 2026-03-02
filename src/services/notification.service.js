const Notification = require("../models/Notification.model");
const Customer = require("../models/Customer.model");
const Sale = require("../models/Sale.model");
const Nursery = require("../models/Nursery.model");
const User = require("../models/User.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");
const {
  isValidExpoPushToken,
  sendExpoPushNotifications
} = require("./push.service");

const DUE_REMINDER_CRON = process.env.DUE_REMINDER_CRON || "0 */6 * * *";
let dueReminderCronTask = null;
let cron = null;
const normalizePhoneDigits = (value) =>
  String(value || "")
    .replace(/\D/g, "")
    .slice(-10);

try {
  // eslint-disable-next-line global-require
  cron = require("node-cron");
} catch {
  cron = null;
}

const removeInvalidPushTokens = async (tokens = []) => {
  if (!Array.isArray(tokens) || !tokens.length) return;
  await User.updateMany(
    {},
    {
      $pull: {
        deviceTokens: { token: { $in: tokens } }
      }
    }
  );
};

const isLikelyExpoToken = (token) =>
  typeof token === "string" && token.trim().startsWith("ExponentPushToken[");

const getUniqueValidDeviceTokens = (user) => {
  const rawTokens = Array.isArray(user?.deviceTokens)
    ? user.deviceTokens.map((entry) => entry?.token).filter(Boolean)
    : [];

  return Array.from(
    new Set(
      rawTokens
        .map((token) => String(token).trim())
        .filter((token) => isLikelyExpoToken(token) && isValidExpoPushToken(token))
    )
  );
};

const buildPushMessagesForUsers = async ({ userIds, title, body, data }) => {
  const users = await User.find({ _id: { $in: userIds } }).select("deviceTokens");
  const messages = [];
  for (const user of users) {
    const tokens = getUniqueValidDeviceTokens(user);

    for (const token of tokens) {
      messages.push({
        to: token,
        sound: "default",
        title,
        body,
        data: data || {}
      });
    }
  }
  return messages;
};

const createCustomerNotification = async ({
  nurseryId,
  customerId,
  type,
  title,
  message,
  meta = {},
  session
}) => {
  if (!customerId) return null;

  const customer = await Customer.findOne({
    _id: customerId,
    deletedAt: { $exists: false }
  }).session(session || null);

  if (!customer) return null;

  const [notification] = await Notification.create(
    [
      {
        nurseryId,
        recipientId: customer._id,
        recipientType: "Customer",
        audience: "CUSTOMER",
        customerId: customer._id,
        customerPhone: customer.mobileNumber || undefined,
        type,
        title,
        message,
        meta,
        status: "SENT",
        sentAt: new Date()
      }
    ],
    session ? { session } : undefined
  );

  if (customer.userId) {
    const messages = await buildPushMessagesForUsers({
      userIds: [customer.userId],
      title,
      body: message,
      data: {
        notificationId: String(notification._id),
        type
      }
    });
    const pushResult = await sendExpoPushNotifications(messages);
    await removeInvalidPushTokens(pushResult.invalidTokens);
    notification.pushStatus = pushResult.failed > 0 ? "FAILED" : "SENT";
    await notification.save();
  }

  return notification;
};

const createRoleNotifications = async ({
  nurseryId,
  roles = [],
  type,
  title,
  message,
  meta = {},
  createdBy,
  session
}) => {
  const normalizedRoles = Array.isArray(roles)
    ? roles
        .map((role) => String(role || "").trim().toUpperCase())
        .filter(Boolean)
    : [];

  if (!normalizedRoles.length) return [];

  const targetUsers = await User.find({
    role: { $in: normalizedRoles },
    isActive: true,
    deletedAt: { $exists: false },
    ...(nurseryId ? { nurseryId } : {})
  })
    .select("_id role")
    .session(session || null);

  if (!targetUsers.length) return [];

  const documents = targetUsers.map((targetUser) => ({
    nurseryId: nurseryId || undefined,
    recipientId: targetUser._id,
    recipientType: "User",
    audience: targetUser.role,
    type,
    title,
    message,
    meta,
    status: "SENT",
    sentAt: new Date(),
    ...(createdBy ? { createdBy } : {})
  }));

  const created = await Notification.create(documents, session ? { session } : undefined);
  const messages = await buildPushMessagesForUsers({
    userIds: targetUsers.map((targetUser) => String(targetUser._id)),
    title,
    body: message,
    data: {
      type,
      screen: "PAYMENT_VERIFICATION",
      ...meta
    }
  });
  const pushResult = await sendExpoPushNotifications(messages);
  await removeInvalidPushTokens(pushResult.invalidTokens);
  const pushStatus = pushResult.failed > 0 ? "FAILED" : "SENT";
  await Notification.updateMany(
    { _id: { $in: created.map((item) => item._id) } },
    { $set: { pushStatus } },
    session ? { session } : undefined
  );

  return created;
};

const resolveNotificationScopeNurseryId = async (user, payloadNurseryId) => {
  if (user.role === "SUPER_ADMIN") {
    return payloadNurseryId || null;
  }
  if (!user.nurseryId) {
    throw new ApiError(statusCode.BAD_REQUEST, "Nursery context is required");
  }
  return user.nurseryId;
};

const resolveCustomerTargets = async ({ nurseryId, customerId, customerPhone }) => {
  const query = { deletedAt: { $exists: false } };
  if (nurseryId) query.nurseryId = nurseryId;
  if (customerId) query._id = customerId;
  if (customerPhone) {
    const last10 = normalizePhoneDigits(customerPhone);
    const phoneVariants = [
      String(customerPhone || "").trim(),
      last10,
      last10 ? `+91${last10}` : null,
      last10 ? `91${last10}` : null
    ].filter(Boolean);
    query.mobileNumber = { $in: [...new Set(phoneVariants)] };
  }
  return Customer.find(query).select("_id userId mobileNumber");
};

const resolvePushUserIdsForCustomers = async (customers, nurseryId) => {
  const pushUserIds = new Set();
  const unresolvedPhoneDigits = [];

  for (const customer of customers) {
    if (customer?.userId) {
      pushUserIds.add(String(customer.userId));
      continue;
    }
    const digits = normalizePhoneDigits(customer?.mobileNumber);
    if (digits) unresolvedPhoneDigits.push(digits);
  }

  if (unresolvedPhoneDigits.length) {
    const phoneOr = unresolvedPhoneDigits.map((digits) => ({
      phoneNumber: { $regex: `${digits}$` }
    }));
    const users = await User.find({
      role: "CUSTOMER",
      deletedAt: { $exists: false },
      ...(nurseryId ? { nurseryId } : {}),
      $or: phoneOr
    }).select("_id phoneNumber");

    users.forEach((user) => {
      pushUserIds.add(String(user._id));
    });
  }

  return pushUserIds;
};

const createAdminNotification = async (payload, user) => {
  const audience = payload.audience;
  const message = String(payload.message || payload.body || "").trim();
  const title = String(payload.title || "").trim();
  const nurseryId = await resolveNotificationScopeNurseryId(user, payload.nurseryId);

  if (!title || !message) {
    throw new ApiError(statusCode.BAD_REQUEST, "title and message are required");
  }

  const documents = [];
  const pushUserIds = new Set();

  if (audience === "CUSTOMER") {
    const customers = await resolveCustomerTargets({
      nurseryId,
      customerId: payload.customerId,
      customerPhone: payload.customerPhone
    });
    if (!customers.length) {
      throw new ApiError(statusCode.NOT_FOUND, "No customer found for the given target");
    }

    const customerPushUserIds = await resolvePushUserIdsForCustomers(
      customers,
      nurseryId
    );

    customers.forEach((customer) => {
      documents.push({
        nurseryId,
        recipientId: customer._id,
        recipientType: "Customer",
        audience,
        customerId: customer._id,
        customerPhone: customer.mobileNumber || undefined,
        type: payload.type || "ADMIN_BROADCAST",
        title,
        message,
        meta: {
          ...(payload.productStatusTag ? { productStatusTag: payload.productStatusTag } : {}),
          byAdmin: true
        },
        status: "SENT",
        sentAt: new Date(),
        createdBy: user.userId
      });
    });
    customerPushUserIds.forEach((id) => pushUserIds.add(String(id)));
  } else {
    const userQuery = { isActive: true, deletedAt: { $exists: false } };
    if (nurseryId) userQuery.nurseryId = nurseryId;
    if (audience !== "ALL") userQuery.role = audience;
    const users = await User.find(userQuery).select("_id");
    users.forEach((targetUser) => {
      documents.push({
        nurseryId,
        recipientId: targetUser._id,
        recipientType: "User",
        audience,
        type: payload.type || "ADMIN_BROADCAST",
        title,
        message,
        meta: {
          ...(payload.productStatusTag ? { productStatusTag: payload.productStatusTag } : {}),
          byAdmin: true
        },
        status: "SENT",
        sentAt: new Date(),
        createdBy: user.userId
      });
      pushUserIds.add(String(targetUser._id));
    });
  }

  if (!documents.length) {
    throw new ApiError(statusCode.NOT_FOUND, "No active recipients found for the selected audience");
  }

  const created = await Notification.insertMany(documents);
  const messages = await buildPushMessagesForUsers({
    userIds: Array.from(pushUserIds),
    title,
    body: message,
    data: {
      type: payload.type || "ADMIN_BROADCAST"
    }
  });
  const pushResult = await sendExpoPushNotifications(messages);
  await removeInvalidPushTokens(pushResult.invalidTokens);
  const pushStatus = pushResult.failed > 0 ? "FAILED" : "SENT";
  await Notification.updateMany(
    { _id: { $in: created.map((item) => item._id) } },
    { $set: { pushStatus } }
  );

  return created[0];
};

const sendTestNotification = async ({ userId, actor }) => {
  const user = await User.findById(userId).select(
    "_id role nurseryId deviceTokens deletedAt isActive"
  );
  if (!user || user.deletedAt || user.isActive === false) {
    throw new ApiError(statusCode.NOT_FOUND, "User not found");
  }

  if (
    actor?.role !== "SUPER_ADMIN" &&
    actor?.nurseryId &&
    user?.nurseryId &&
    String(actor.nurseryId) !== String(user.nurseryId)
  ) {
    throw new ApiError(
      statusCode.FORBIDDEN,
      "Cannot send test notification outside your nursery"
    );
  }

  const title = "PNMS Test Notification";
  const body = "If you received this, push notifications are configured correctly.";
  const messages = await buildPushMessagesForUsers({
    userIds: [String(user._id)],
    title,
    body,
    data: {
      type: "TEST_PUSH",
      userId: String(user._id)
    }
  });

  const pushResult = await sendExpoPushNotifications(messages);
  await removeInvalidPushTokens(pushResult.invalidTokens);

  return {
    targetUserId: String(user._id),
    messageCount: messages.length,
    ...pushResult
  };
};

const buildNotificationQueryForUser = async (user) => {
  const query = {};

  if (user.role === "CUSTOMER") {
    const customer = await Customer.findOne({
      userId: user.userId,
      deletedAt: { $exists: false }
    });
    if (!customer) return null;
    query.recipientType = "Customer";
    query.recipientId = customer._id;
  } else {
    query.recipientType = "User";
    query.recipientId = user.userId;
  }

  if (user.nurseryId) {
    query.nurseryId = user.nurseryId;
  }

  return query;
};

const getNotificationsForUser = async (user) => {
  const query = await buildNotificationQueryForUser(user);
  if (!query) return [];
  return Notification.find(query).sort({ createdAt: -1 });
};

const markNotificationRead = async (notificationId, user) => {
  const query = { _id: notificationId };

  if (user.role === "CUSTOMER") {
    const customer = await Customer.findOne({
      userId: user.userId,
      deletedAt: { $exists: false }
    });
    if (!customer) return null;
    query.recipientType = "Customer";
    query.recipientId = customer._id;
  } else {
    query.recipientType = "User";
    query.recipientId = user.userId;
  }

  if (user.nurseryId) {
    query.nurseryId = user.nurseryId;
  }

  const notification = await Notification.findOne(query);
  if (!notification) {
    return null;
  }

  notification.status = "READ";
  notification.readAt = new Date();
  await notification.save();

  return notification;
};

const clearNotificationsForUser = async (user) => {
  const query = await buildNotificationQueryForUser(user);
  if (!query) return { deletedCount: 0 };

  const result = await Notification.deleteMany(query);
  return { deletedCount: Number(result?.deletedCount || 0) };
};

const setDueReminderConfig = async (user, everyDays) => {
  const nurseryId = user?.nurseryId;
  if (!nurseryId && user.role !== "SUPER_ADMIN") {
    throw new ApiError(statusCode.BAD_REQUEST, "Nursery context is required");
  }
  const targetNurseryId = nurseryId || user.nurseryId;
  if (!targetNurseryId) {
    throw new ApiError(statusCode.BAD_REQUEST, "Nursery id is required");
  }

  await Nursery.findByIdAndUpdate(
    targetNurseryId,
    {
      $set: {
        "settings.notificationConfig.dueReminderEveryDays": everyDays,
        updatedBy: user.userId
      }
    },
    { new: true }
  );

  return { dueReminderEveryDays: everyDays };
};

const runDueReminderSweep = async () => {
  const nurseries = await Nursery.find({
    deletedAt: { $exists: false },
    status: "ACTIVE"
  }).select("_id settings.notificationConfig");

  for (const nursery of nurseries) {
    const everyDays = Number(nursery?.settings?.notificationConfig?.dueReminderEveryDays || 0);
    if (!everyDays) continue;

    const dueSales = await Sale.find({
      nurseryId: nursery._id,
      isVoided: { $ne: true },
      dueAmount: { $gt: 0 },
      customer: { $exists: true, $ne: null }
    }).select("_id customer dueAmount saleNumber");

    for (const sale of dueSales) {
      const lastReminder = await Notification.findOne({
        nurseryId: nursery._id,
        recipientType: "Customer",
        customerId: sale.customer,
        type: "DUE_REMINDER",
        "meta.saleId": sale._id
      }).sort({ createdAt: -1 });

      const now = Date.now();
      const lastCreatedAt = lastReminder?.createdAt ? new Date(lastReminder.createdAt).getTime() : 0;
      const shouldSend = !lastCreatedAt || now - lastCreatedAt >= everyDays * 24 * 60 * 60 * 1000;
      if (!shouldSend) continue;

      await createCustomerNotification({
        nurseryId: nursery._id,
        customerId: sale.customer,
        type: "DUE_REMINDER",
        title: "Payment due reminder",
        message: `You have pending due for sale ${sale.saleNumber || ""}. Please complete payment.`,
        meta: {
          saleId: sale._id,
          dueAmount: sale.dueAmount,
          intervalDays: everyDays
        }
      });
    }
  }
};

const startDueReminderJob = () => {
  if (dueReminderCronTask) return;

  if (cron?.schedule) {
    dueReminderCronTask = cron.schedule(DUE_REMINDER_CRON, () => {
      runDueReminderSweep().catch((err) => {
        console.error("[due-reminder-job] failed:", err.message);
      });
    });
  } else {
    const fallbackMs = Number(process.env.DUE_REMINDER_SWEEP_INTERVAL_MS || 6 * 60 * 60 * 1000);
    dueReminderCronTask = {
      stop: (() => {
        const id = setInterval(() => {
          runDueReminderSweep().catch((err) => {
            console.error("[due-reminder-job-fallback] failed:", err.message);
          });
        }, fallbackMs);
        return () => clearInterval(id);
      })()
    };
    console.warn(
      "[due-reminder-job] node-cron not installed; using interval fallback."
    );
  }

  // Run once during startup so reminders are not delayed until first cron tick.
  runDueReminderSweep().catch((err) => {
    console.error("[due-reminder-job-startup] failed:", err.message);
  });
};

module.exports = {
  createCustomerNotification,
  createRoleNotifications,
  createAdminNotification,
  getNotificationsForUser,
  markNotificationRead,
  clearNotificationsForUser,
  setDueReminderConfig,
  startDueReminderJob,
  sendTestNotification
};
