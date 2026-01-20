const mongoose = require("mongoose");

const germinationSchema = new mongoose.Schema(
  {
    sowing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SeedSowing",
      required: true
    },

    germinatedSeeds: {
      type: Number,
      required: true,
      min: 0
    },

    germinationDate: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Germination", germinationSchema);
