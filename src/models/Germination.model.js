const mongoose = require("mongoose");

const germinationSchema = new mongoose.Schema(
  {
    sowingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SowingBatch",
      required: true
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
      enum: ["ADMIN", "STAFF"],
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Germination", germinationSchema);
