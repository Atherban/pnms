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
    subtitle: {
      type: String,
      trim: true
    },
    cta: {
      type: String,
      trim: true
    },
    color: {
      type: String,
      trim: true,
      default: "#0EA5E9"
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

bannerSchema.pre("validate", function () {
  const fallbackColor = "#0EA5E9";
  const nextColor = String(this.color || "").trim();
  if (!nextColor) {
    this.color = fallbackColor;
    return;
  }

  if (!/^#[0-9A-Fa-f]{6}$/.test(nextColor)) {
    throw new Error("color must be a valid hex value like #0EA5E9");
  }
  this.color = nextColor.toUpperCase();
});

module.exports = mongoose.model("Banner", bannerSchema);
