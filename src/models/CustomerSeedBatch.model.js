const mongoose = require("mongoose");

const CUSTOMER_SEED_BATCH_STATUS = [
  "RECEIVED",
  "SOWN",
  "GERMINATING",
  "READY",
  "COLLECTED",
  "CLOSED",
  "DISCARDED"
];

const customerSeedBatchSchema = new mongoose.Schema(
  {
    nurseryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nursery",
      required: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true
    },
    plantTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlantType",
      required: true
    },
    seedQuantity: {
      type: Number,
      required: true,
      min: 1
    },
    seedsSown: {
      type: Number,
      default: 0,
      min: 0
    },
    seedsGerminated: {
      type: Number,
      default: 0,
      min: 0
    },
    germinatedQuantity: {
      type: Number,
      default: 0,
      min: 0
    },
    seedsDiscarded: {
      type: Number,
      default: 0,
      min: 0
    },
    discardedQuantity: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: CUSTOMER_SEED_BATCH_STATUS,
      default: "RECEIVED"
    },
    sowingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SowingBatch"
    },
    germinationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Germination"
    },
    expectedReadyDate: {
      type: Date
    },
    estimatedPickupDate: {
      type: Date
    },
    serviceChargeEstimate: {
      type: Number,
      min: 0,
      default: 0
    },
    discountAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    finalAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale"
    },
    notes: {
      type: String,
      trim: true
    },
    collectedAt: {
      type: Date
    },
    discardedAt: {
      type: Date
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

customerSeedBatchSchema.virtual("remainingSeedsForSowing").get(function () {
  return Math.max((this.seedQuantity || 0) - (this.seedsSown || 0), 0);
});

customerSeedBatchSchema.virtual("pendingSeedsAfterGermination").get(function () {
  const germinated = this.germinatedQuantity || this.seedsGerminated || 0;
  const discarded = this.discardedQuantity || this.seedsDiscarded || 0;
  return Math.max((this.seedsSown || 0) - germinated - discarded, 0);
});

customerSeedBatchSchema.pre("validate", function () {
  if (this.expectedReadyDate && !this.estimatedPickupDate) {
    this.estimatedPickupDate = this.expectedReadyDate;
  }
  if (this.estimatedPickupDate && !this.expectedReadyDate) {
    this.expectedReadyDate = this.estimatedPickupDate;
  }

  const germinated = Number(this.germinatedQuantity || this.seedsGerminated || 0);
  const discarded = Number(this.discardedQuantity || this.seedsDiscarded || 0);
  this.germinatedQuantity = germinated;
  this.discardedQuantity = discarded;
  this.seedsGerminated = germinated;
  this.seedsDiscarded = discarded;

  const seedsSown = Number(this.seedsSown || 0);
  const seedQuantity = Number(this.seedQuantity || 0);
  if (seedsSown > seedQuantity) {
    throw new Error("seedsSown cannot exceed seedQuantity");
  }
  if (germinated + discarded > seedsSown) {
    throw new Error("germinatedQuantity + discardedQuantity cannot exceed seedsSown");
  }

  const estimate = Number(this.serviceChargeEstimate || 0);
  const discount = Math.max(0, Number(this.discountAmount || 0));
  if (!this.finalAmount || this.finalAmount < 0) {
    this.finalAmount = Math.max(estimate - discount, 0);
  }
});

customerSeedBatchSchema.index({ nurseryId: 1, customerId: 1, createdAt: -1 });
customerSeedBatchSchema.index({ nurseryId: 1, status: 1, createdAt: -1 });
customerSeedBatchSchema.index({ customerId: 1, plantTypeId: 1 });
customerSeedBatchSchema.index({ nurseryId: 1, saleId: 1 });

customerSeedBatchSchema.set("toJSON", { virtuals: true });
customerSeedBatchSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("CustomerSeedBatch", customerSeedBatchSchema);
