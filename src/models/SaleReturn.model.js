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
    itemsReturned: [
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
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    status: {
      type: String,
      enum: ["REQUESTED", "APPROVED", "REJECTED", "COMPLETED"],
      default: "REQUESTED"
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    approvedAt: Date,
    completedAt: Date,
    rejectedReason: String,
    reason: String,
    refundAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    receipt: {
      receiptNumber: String,
      generatedAt: Date,
      generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      saleNumber: String,
      saleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Sale"
      },
      returnId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SaleReturn"
      },
      itemsReturned: [
        {
          saleItemId: mongoose.Schema.Types.ObjectId,
          quantityReturned: Number,
          refundAmount: Number
        }
      ],
      reason: String,
      approval: {
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        approvedAt: Date
      },
      totals: {
        grossReturnAmount: Number,
        netReturnAmount: Number,
        refundIssued: Number
      }
    }
  },
  { timestamps: true }
);

saleReturnSchema.pre("validate", function () {
  if ((!this.items || !this.items.length) && Array.isArray(this.itemsReturned) && this.itemsReturned.length) {
    this.items = this.itemsReturned;
  }
  if ((!this.itemsReturned || !this.itemsReturned.length) && Array.isArray(this.items) && this.items.length) {
    this.itemsReturned = this.items;
  }
});

saleReturnSchema.index({ saleId: 1, status: 1 });
saleReturnSchema.index({ nurseryId: 1, createdAt: -1 });
saleReturnSchema.index({ requestedBy: 1, createdAt: -1 });

module.exports = mongoose.model("SaleReturn", saleReturnSchema);
