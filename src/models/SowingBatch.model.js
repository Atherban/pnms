const mongoose = require("mongoose");

const sowingBatchSchema = new mongoose.Schema(
  {
    nurseryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nursery"
    },

    seed: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seed",
      required: false
    },
    customerSeedBatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerSeedBatch"
    },

    plantType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlantType",
      required: true
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer"
    },

    quantitySown: {
      type: Number,
      required: true,
      min: 1
    },

    quantityGerminated: {
      type: Number,
      default: 0,
      min: 0
    },
    quantityDiscarded: {
      type: Number,
      default: 0,
      min: 0
    },

    sowingDate: {
      type: Date,
      default: Date.now
    },

    expectedYield: Number,

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    roleAtTime: String
  },
  { timestamps: true }
);

sowingBatchSchema.virtual("quantityPendingGermination").get(function () {
  return Math.max(this.quantitySown - this.quantityGerminated, 0);
});

sowingBatchSchema.set("toJSON", { virtuals: true });
sowingBatchSchema.set("toObject", { virtuals: true });
sowingBatchSchema.index({ nurseryId: 1, createdAt: -1 });
sowingBatchSchema.index({ nurseryId: 1, plantType: 1, createdAt: -1 });
sowingBatchSchema.index({ customerId: 1, createdAt: -1 });
sowingBatchSchema.index({ customerSeedBatch: 1, createdAt: -1 });

sowingBatchSchema.pre("validate", function () {
  const sown = Number(this.quantitySown || 0);
  const germinated = Number(this.quantityGerminated || 0);
  const discarded = Number(this.quantityDiscarded || 0);

  if (germinated + discarded > sown) {
    throw new Error("quantityGerminated + quantityDiscarded cannot exceed quantitySown");
  }
});

module.exports = mongoose.model("SowingBatch", sowingBatchSchema);
