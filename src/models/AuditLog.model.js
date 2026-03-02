const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    nurseryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nursery"
    },
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    action: {
      type: String,
      required: true
    },
    entityType: {
      type: String,
      required: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    before: {
      type: Object
    },
    after: {
      type: Object
    },
    ip: String,
    userAgent: String,
    occurredAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

auditLogSchema.index({ nurseryId: 1, occurredAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, occurredAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
