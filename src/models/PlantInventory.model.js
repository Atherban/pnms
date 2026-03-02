const mongoose = require("mongoose");

const plantInventorySchema = new mongoose.Schema(
  {
    nurseryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nursery"
    },

    plantType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlantType",
      required: true
    },

    sourceType: {
      type: String,
      enum: ["GERMINATION", "PURCHASED"],
      required: true
    },

    // Legacy field kept for old records and UI consumers
    source: {
      type: String,
      enum: ["SOWN", "PURCHASED"]
    },

    sourceRef: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "sourceModel"
    },

    sourceModel: {
      type: String,
      enum: ["Germination", "Expense"],
      required: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 0
    },

    quantityUnit: {
      type: String,
      enum: ["SEEDS", "GRAM", "KG", "UNITS"],
      default: "UNITS"
    },

    initialQuantity: {
      type: Number,
      required: true,
      min: 1
    },

    unitCost: {
      type: Number,
      min: 0,
      default: 0
    },

    growthStage: {
      type: String,
      enum: ["GERMINATED", "READY_FOR_SALE", "SOLD_OUT"],
      default: "GERMINATED"
    },

    status: {
      type: String,
      enum: ["AVAILABLE", "OUT_OF_STOCK"],
      default: "AVAILABLE"
    },

    receivedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

plantInventorySchema.pre("validate", function () {
  if (!this.sourceType && this.source) {
    this.sourceType = this.source === "SOWN" ? "GERMINATION" : this.source;
  }

  if (!this.source && this.sourceType) {
    this.source = this.sourceType === "GERMINATION" ? "SOWN" : "PURCHASED";
  }

  if (!this.sourceModel && this.sourceType) {
    this.sourceModel = this.sourceType === "GERMINATION" ? "Germination" : "Expense";
  }

  // Fallback for legacy docs that predate source tracking.
  if (!this.sourceRef && this.plantType) {
    this.sourceRef = this.plantType;
  }

  if (this.initialQuantity === undefined || this.initialQuantity === null) {
    this.initialQuantity = this.quantity;
  }

  if (this.quantity <= 0) {
    this.status = "OUT_OF_STOCK";
    this.growthStage = "SOLD_OUT";
  } else {
    this.status = "AVAILABLE";
    if (this.growthStage === "SOLD_OUT") {
      this.growthStage = "READY_FOR_SALE";
    }
  }

});

plantInventorySchema.set("toJSON", { virtuals: true });
plantInventorySchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("PlantInventory", plantInventorySchema);
