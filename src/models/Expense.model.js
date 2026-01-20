const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "SEED",
        "FERTILIZER",
        "POT",
        "SOIL",
        "WATER",
        "ELECTRICITY",
        "TRANSPORT",
        "TOOLS",
        "OTHER"
      ],
      required: true
    },

    description: {
      type: String
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    date: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);
