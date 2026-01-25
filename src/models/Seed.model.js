const mongoose = require("mongoose");

const seedSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: String,
      enum: ["VEGETABLE", "FLOWER", "FRUIT", "HERB"],
      required: true
    },

    supplierName: {
      type: String,
      required: true,
      trim: true
    },

    totalPurchased: {
      type: Number,
      required: true,
      min: 1
    },

    seedsUsed: {
      type: Number,
      default: 0,
      min: 0
    },

    purchaseDate: {
      type: Date,
      required: true
    },

    expiryDate: {
      type: Date,
      required: true
    },

    images: [
      {
        fileName: {
          type: String,
          required: true
        },
        uploadedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Seed", seedSchema);
