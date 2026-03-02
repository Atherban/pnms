const mongoose = require("mongoose");

const nurseryAdminAssignmentSchema = new mongoose.Schema(
  {
    nurseryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nursery",
      required: true
    },
    adminUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

nurseryAdminAssignmentSchema.index(
  { nurseryId: 1, adminUserId: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "NurseryAdminAssignment",
  nurseryAdminAssignmentSchema
);
