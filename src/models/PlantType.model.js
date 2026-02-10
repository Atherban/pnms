const mongoose = require("mongoose");

const plantTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    category: {
      type: String,
      required: true,
      enum: ["VEGETABLE", "FLOWER", "FRUIT", "HERB"]
    },

    variety: {
      type: String,
      trim: true
    },

    lifecycleDays: {
      type: Number,
      min: 1
    },

    sellingPrice: {
      type: Number,
      required: true,
      min: 0
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
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlantType", plantTypeSchema);
