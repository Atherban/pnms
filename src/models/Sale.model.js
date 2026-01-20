const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer"
    },

    items: [
      {
        plant: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Plant",
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
        }
      }
    ],

    paymentMode: {
      type: String,
      enum: ["CASH", "UPI", "ONLINE"],
      required: true
    },

    saleDate: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Sale", saleSchema);
