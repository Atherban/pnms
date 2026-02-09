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
      required: true
    },

    variety: {
      type: String
    },

    lifecycleDays: {
      type: Number
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
