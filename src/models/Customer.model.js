const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    nurseryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nursery"
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    name: {
      type: String,
      required: true
    },

    mobileNumber: {
      type: String,
      required: true,
      trim: true
    },

    address: {
      type: String
    },

    isActive: {
      type: Boolean,
      default: true
    },

    deletedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

customerSchema.index({ nurseryId: 1, isActive: 1 });
customerSchema.index(
  { nurseryId: 1, mobileNumber: 1 },
  { unique: true, partialFilterExpression: { deletedAt: { $exists: false } } }
);

module.exports = mongoose.model("Customer", customerSchema);
