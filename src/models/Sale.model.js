const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
  {
    nurseryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nursery"
    },

    saleNumber: {
      type: String
    },

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

    grossAmount: {
      type: Number,
      min: 0
    },

    discountAmount: {
      type: Number,
      min: 0,
      default: 0
    },

    netAmount: {
      type: Number,
      min: 0
    },

    paidAmount: {
      type: Number,
      min: 0,
      default: 0
    },

    dueAmount: {
      type: Number,
      min: 0,
      default: 0
    },

    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PARTIALLY_PAID", "PAID", "OVERDUE"],
      default: "PAID"
    },

    verificationStatus: {
      type: String,
      enum: ["NOT_REQUIRED", "PENDING", "VERIFIED", "REJECTED"],
      default: "NOT_REQUIRED"
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer"
    },

    paymentMode: {
      type: String,
      enum: ["CASH", "UPI", "ONLINE", "BANK_TRANSFER"],
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
      enum: ["SUPER_ADMIN", "NURSERY_ADMIN", "STAFF"],
      required: true
    },

    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    isVoided: {
      type: Boolean,
      default: false
    },

    voidReason: {
      type: String
    }
  },
  { timestamps: true }
);

saleSchema.index({ saleDate: 1 });
saleSchema.index({ nurseryId: 1, saleNumber: 1 }, { unique: true, sparse: true });
saleSchema.index({ paymentStatus: 1, dueAmount: 1 });

saleSchema.pre("validate", function () {
  if (this.grossAmount === undefined || this.grossAmount === null) {
    this.grossAmount = this.totalAmount;
  }

  if (this.netAmount === undefined || this.netAmount === null) {
    this.netAmount = this.grossAmount - (this.discountAmount || 0);
  }

  const paid = this.paidAmount || 0;
  this.dueAmount = Math.max((this.netAmount || 0) - paid, 0);

  if (this.dueAmount === 0) {
    this.paymentStatus = "PAID";
  } else if (paid > 0) {
    this.paymentStatus = "PARTIALLY_PAID";
  } else {
    this.paymentStatus = "UNPAID";
  }
});

module.exports = mongoose.model("Sale", saleSchema);
