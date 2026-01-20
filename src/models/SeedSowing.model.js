const mongoose = require("mongoose");

const seedSowingSchema = new mongoose.Schema(
  {
    seed: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seed",
      required: true
    },

    totalSeedsSown: {
      type: Number,
      required: true,
      min: 1
    },

    sowingDate: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("SeedSowing", seedSowingSchema);
