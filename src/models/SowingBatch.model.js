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
      required: true
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

module.exports = mongoose.model("SowingBatch", sowingBatchSchema);
