const mongoose = require("mongoose");

const plantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: String,
      enum: ["FLOWER", "FRUIT", "INDOOR", "OUTDOOR"],
      required: true
    },

    price: {
      type: Number,
      required: true,
      min: 0
    },

    quantityAvailable: {
      type: Number,
      required: true,
      min: 0
    },

    status: {
      type: String,
      enum: ["AVAILABLE", "OUT_OF_STOCK"],
      default: "AVAILABLE"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Plant", plantSchema);
