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

    growthStages: [
      {
        stage: {
          type: String,
          enum: ["SEED", "SOWN", "GERMINATED", "HARDENED", "READY_FOR_SALE"],
          required: true
        },
        dayFrom: {
          type: Number,
          min: 0,
          required: true
        },
        dayTo: {
          type: Number,
          min: 0,
          required: true
        }
      }
    ],

    sellingPrice: {
      type: Number,
      required: true,
      min: 0
    },

    minStockLevel: {
      type: Number,
      min: 0,
      default: 0
    },

    defaultCostPrice: {
      type: Number,
      min: 0,
      default: 0
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
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

plantTypeSchema.pre("validate", function () {
  if (!this.growthStages || this.growthStages.length === 0) {
    return;
  }

  for (const stage of this.growthStages) {
    if (stage.dayTo < stage.dayFrom) {
      throw new Error(`Invalid growth stage range for stage "${stage.stage}"`);
    }
  }
});

module.exports = mongoose.model("PlantType", plantTypeSchema);
