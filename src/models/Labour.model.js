const mongoose = require("mongoose");

const labourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    workType: {
      type: String,
      enum: [
        "SEED_SOWING",
        "WATERING",
        "POTTING",
        "WEEDING",
        "FERTILIZING",
        "PACKING",
        "LOADING"
      ],
      required: true
    },

    hoursWorked: {
      type: Number,
      min: 0
    },

    wagePerHour: {
      type: Number,
      min: 0
    },

    wagePerDay: {
      type: Number,
      min: 0
    },

    date: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

labourSchema.index({ date: 1 });

module.exports = mongoose.model("Labour", labourSchema);
