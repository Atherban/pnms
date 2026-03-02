const mongoose = require("mongoose");

const financialLedgerEntrySchema = new mongoose.Schema(
  {
    nurseryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nursery"
    },
    entryType: {
      type: String,
      enum: [
        "SALE_POSTED",
        "PAYMENT_VERIFIED",
        "REFUND_POSTED",
        "EXPENSE_POSTED",
        "INVENTORY_ADJUSTMENT"
      ],
      required: true
    },
    referenceType: {
      type: String,
      required: true
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    debit: {
      type: Number,
      min: 0,
      default: 0
    },
    credit: {
      type: Number,
      min: 0,
      default: 0
    },
    balanceImpact: {
      type: Number,
      required: true
    },
    postedAt: {
      type: Date,
      default: Date.now
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    meta: {
      type: Object,
      default: {}
    }
  },
  { timestamps: true }
);

financialLedgerEntrySchema.index({ nurseryId: 1, postedAt: -1 });
financialLedgerEntrySchema.index({ referenceType: 1, referenceId: 1 });

financialLedgerEntrySchema.pre("findOneAndUpdate", function () {
  throw new Error("Financial ledger entries are immutable");
});

financialLedgerEntrySchema.pre("updateOne", function () {
  throw new Error("Financial ledger entries are immutable");
});

financialLedgerEntrySchema.pre("deleteOne", function () {
  throw new Error("Financial ledger entries are immutable");
});

module.exports = mongoose.model(
  "FinancialLedgerEntry",
  financialLedgerEntrySchema
);
