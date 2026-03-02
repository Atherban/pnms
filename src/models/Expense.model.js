const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    nurseryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nursery"
    },

    type: {
      type: String,
      enum: [
        "SEED",
        "FERTILIZER",
        "POT",
        "SOIL",
        "WATER",
        "ELECTRICITY",
        "TRANSPORT",
        "TOOLS",
        "OTHER"
      ],
      required: true
    },

    description: {
      type: String
    },

    purpose: {
      type: String
    },

    productDetails: {
      type: String
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    date: {
      type: Date,
      required: true
    },

    purchasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    deletedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

expenseSchema.index({ date: 1 });
expenseSchema.index({ nurseryId: 1, purchasedBy: 1, date: -1 });
expenseSchema.index({ purchasedBy: 1, date: -1 });

module.exports = mongoose.model("Expense", expenseSchema);
