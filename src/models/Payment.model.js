const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    nurseryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nursery"
    },
    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      required: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer"
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01
    },
    mode: {
      type: String,
      enum: ["CASH", "UPI", "ONLINE", "BANK_TRANSFER"],
      required: true
    },
    status: {
      type: String,
      enum: ["PENDING_VERIFICATION", "VERIFIED", "REJECTED", "CANCELLED"],
      default: "PENDING_VERIFICATION"
    },
    proofImage: {
      fileName: String,
      uploadedAt: Date
    },
    utrNumber: String,
    transactionRef: String,
    rejectionReason: String,
    receivedAt: {
      type: Date,
      default: Date.now
    },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

paymentSchema.index({ saleId: 1, status: 1 });
paymentSchema.index({ nurseryId: 1, createdAt: -1 });

paymentSchema.pre("validate", function () {
  const hasUtr = !!String(this.utrNumber || "").trim();
  const hasTxRef = !!String(this.transactionRef || "").trim();

  if (!hasTxRef && hasUtr) {
    this.transactionRef = this.utrNumber;
  }

  if (!hasUtr && hasTxRef && this.mode !== "CASH") {
    this.utrNumber = this.transactionRef;
  }
});

module.exports = mongoose.model("Payment", paymentSchema);
