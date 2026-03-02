const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    nurseryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nursery"
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    recipientType: {
      type: String,
      enum: ["User", "Customer"],
      default: "User"
    },
    audience: {
      type: String,
      enum: ["ALL", "CUSTOMER", "STAFF", "NURSERY_ADMIN", "SUPER_ADMIN"],
      default: "ALL"
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer"
    },
    customerPhone: String,
    type: {
      type: String,
      enum: [
        "SOWING_UPDATED",
        "GERMINATION_UPDATED",
        "PRODUCT_READY",
        "PAYMENT_VERIFICATION_REQUIRED",
        "PAYMENT_ACCEPTED",
        "PAYMENT_REJECTED",
        "DUE_REMINDER",
        "ADMIN_BROADCAST"
      ],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    meta: {
      type: Object,
      default: {}
    },
    status: {
      type: String,
      enum: ["PENDING", "SENT", "READ", "FAILED"],
      default: "PENDING"
    },
    pushStatus: {
      type: String,
      enum: ["NOT_ATTEMPTED", "SENT", "FAILED"],
      default: "NOT_ATTEMPTED"
    },
    scheduledAt: Date,
    sentAt: Date,
    readAt: Date
  },
  { timestamps: true }
);

notificationSchema.index({ recipientId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
