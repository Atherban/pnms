const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },

    items: [
      {
        plant: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Plant",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        priceAtSale: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],

    paymentMode: {
      type: String,
      enum: ["CASH", "UPI", "ONLINE"],
      required: true,
    },

    saleDate: {
      type: Date,
      default: Date.now,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    roleAtTime: {
      type: String,
      enum: ["ADMIN", "STAFF"],
      required: true,
    },
  },
  { timestamps: true },
);

saleSchema.index({ saleDate: 1 });

module.exports = mongoose.model("Sale", saleSchema);
