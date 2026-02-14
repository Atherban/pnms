const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
  {
    items: [
      {
        inventory: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "PlantInventory",
          required: true
        },

        quantity: {
          type: Number,
          required: true,
          min: 1
        },

        priceAtSale: {
          type: Number,
          required: true,
          min: 0
        },

        costAtSale: {
          type: Number,
          required: true,
          min: 0
        },

        profit: {
          type: Number,
          required: true
        },

        batchDeductions: [
          {
            inventory: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "PlantInventory",
              required: true
            },
            quantity: {
              type: Number,
              required: true,
              min: 1
            },
            unitCost: {
              type: Number,
              required: true,
              min: 0
            }
          }
        ]
      }
    ],

    totalCost: {
      type: Number,
      required: true,
      min: 0
    },

    totalProfit: {
      type: Number,
      required: true
    },

    grossMarginPercent: {
      type: Number,
      default: 0
    },

    // Backward compatibility field for old UI integrations
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer"
    },

    paymentMode: {
      type: String,
      enum: ["CASH", "UPI", "ONLINE"],
      required: true
    },

    saleDate: {
      type: Date,
      default: Date.now
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

saleSchema.index({ saleDate: 1 });

module.exports = mongoose.model("Sale", saleSchema);
