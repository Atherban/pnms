const mongoose = require("mongoose");

const inventoryTransactionSchema = new mongoose.Schema(
  {
    nurseryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nursery"
    },
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlantInventory",
      required: true
    },
    type: {
      type: String,
      enum: [
        "INBOUND_GERMINATION",
        "INBOUND_PURCHASE",
        "OUTBOUND_SALE",
        "INBOUND_RETURN",
        "ADJUSTMENT_LOSS",
        "ADJUSTMENT_DAMAGE",
        "ADJUSTMENT_CORRECTION"
      ],
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    quantityUnitSnapshot: {
      type: String,
      enum: ["SEEDS", "GRAM", "KG", "UNITS"],
      default: "UNITS"
    },
    unitCostSnapshot: {
      type: Number,
      min: 0,
      default: 0
    },
    reason: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    referenceType: {
      type: String,
      required: true
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    }
  },
  { timestamps: true }
);

inventoryTransactionSchema.index({ inventoryId: 1, createdAt: -1 });

module.exports = mongoose.model(
  "InventoryTransaction",
  inventoryTransactionSchema
);
