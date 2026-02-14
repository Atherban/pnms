const mongoose = require("mongoose");

const sowingBatchSchema = new mongoose.Schema(
  {
    seed: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seed",
      required: true
    },

    plantType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlantType",
      required: true
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

module.exports = mongoose.model("SowingBatch", sowingBatchSchema);
