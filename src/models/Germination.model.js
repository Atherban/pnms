const mongoose = require("mongoose");

const germinationSchema = new mongoose.Schema(
  {
    nurseryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nursery"
    },

    sowingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SowingBatch",
      required: true
    },
    customerSeedBatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerSeedBatch"
    },
    germinatedSeeds: {
      type: Number,
      required: true,
      min: 0
    },
    discardedSeeds: {
      type: Number,
      min: 0,
      default: 0
    },
    germinationDate: {
      type: Date,
      default: Date.now
    },
    inventoryBatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlantInventory"
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    roleAtTime: {
      type: String,
      enum: ["SUPER_ADMIN", "NURSERY_ADMIN", "STAFF"],
      required: true
    }
  },
  { timestamps: true }
);

germinationSchema.index({ nurseryId: 1, createdAt: -1 });
germinationSchema.index({ sowingId: 1, createdAt: -1 });
germinationSchema.index({ customerSeedBatch: 1, createdAt: -1 });

germinationSchema.pre("validate", function () {
  const germinated = Number(this.germinatedSeeds || 0);
  const discarded = Number(this.discardedSeeds || 0);

  if (germinated + discarded <= 0) {
    throw new Error("germinatedSeeds or discardedSeeds must be greater than 0");
  }
});

module.exports = mongoose.model("Germination", germinationSchema);
