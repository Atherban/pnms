const mongoose = require("mongoose");

const saleReturnSchema = new mongoose.Schema(
  {
    nurseryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nursery"
    },
    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      required: true
    },
    items: [
      {
        saleItemId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true
        },
        quantityReturned: {
          type: Number,
          required: true,
          min: 1
        },
        refundAmount: {
          type: Number,
          min: 0,
          default: 0
        },
        inventoryAction: {
          type: String,
          enum: ["RESTOCK", "SCRAP"],
          default: "RESTOCK"
        }
      }
    ],
    status: {
      type: String,
      enum: ["REQUESTED", "APPROVED", "REJECTED", "COMPLETED"],
      default: "REQUESTED"
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    reason: String
  },
  { timestamps: true }
);

saleReturnSchema.index({ saleId: 1, status: 1 });

module.exports = mongoose.model("SaleReturn", saleReturnSchema);
