const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    scope: {
      type: String,
      enum: ["GLOBAL_SUPER_ADMIN", "NURSERY_ADMIN"],
      required: true
    },
    nurseryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nursery"
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    image: {
      fileName: String,
      uploadedAt: Date
    },
    redirectUrl: String,
    priority: {
      type: Number,
      default: 0
    },
    startAt: {
      type: Date,
      required: true
    },
    endAt: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ["DRAFT", "ACTIVE", "INACTIVE", "EXPIRED"],
      default: "DRAFT"
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

bannerSchema.index({ scope: 1, nurseryId: 1, status: 1, priority: -1 });

module.exports = mongoose.model("Banner", bannerSchema);
