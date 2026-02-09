const mongoose = require("mongoose");

const plantInventorySchema = new mongoose.Schema(
  {
    plantType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlantType",
      required: true
    },

    source: {
      type: String,
      enum: ["SOWN", "PURCHASED"],
      required: true
    },

    sourceRef: {
      type: mongoose.Schema.Types.ObjectId
    },

    quantity: {
      type: Number,
      required: true
    },

    status: {
      type: String,
      enum: ["AVAILABLE", "OUT_OF_STOCK"],
      default: "AVAILABLE"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlantInventory", plantInventorySchema);
