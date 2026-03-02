const mongoose = require("mongoose");

const staffAccountSchema = new mongoose.Schema(
  {
    nurseryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nursery"
    },
    staffUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    periodStart: {
      type: Date,
      required: true
    },
    periodEnd: {
      type: Date,
      required: true
    },
    totalSalesAmount: {
      type: Number,
      default: 0
    },
    totalCollectedAmount: {
      type: Number,
      default: 0
    },
    totalExpensesRecorded: {
      type: Number,
      default: 0
    },
    netAccountableBalance: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

staffAccountSchema.index({ nurseryId: 1, staffUserId: 1, periodStart: 1, periodEnd: 1 }, { unique: true });

module.exports = mongoose.model("StaffAccount", staffAccountSchema);
