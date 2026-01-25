const mongoose = require("mongoose");

const seedSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
    },

    supplierName: {
      type: String,
      required: true,
    },

    totalPurchased: {
      type: Number,
      required: true,
      min: 0,
    },

    seedsUsed: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    purchaseDate: {
      type: Date,
      required: true,
    },

    expiryDate: {
      type: Date,
      required: true,
    },

    images: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Seed", seedSchema);
