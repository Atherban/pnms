const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const deviceTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      trim: true
    },
    platform: {
      type: String,
      enum: ["ios", "android", "web", "unknown"],
      default: "unknown"
    },
    appOwnership: {
      type: String,
      default: undefined
    },
    deviceName: {
      type: String,
      default: undefined
    },
    lastSeenAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false, timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    nurseryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nursery"
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      lowercase: true
    },

    phoneNumber: {
      type: String,
      trim: true
    },

    password: {
      type: String,
      required: true,
      select: false
    },

    role: {
      type: String,
      enum: ["SUPER_ADMIN", "NURSERY_ADMIN", "STAFF", "CUSTOMER"],
      default: "STAFF"
    },

    isActive: {
      type: Boolean,
      default: true
    },

    mustChangePassword: {
      type: Boolean,
      default: false
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    deletedAt: {
      type: Date
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    deviceTokens: {
      type: [deviceTokenSchema],
      default: []
    }
  },
  { timestamps: true }
);

// Hash password
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ phoneNumber: 1 }, { unique: true, sparse: true });
userSchema.index({ nurseryId: 1, role: 1, isActive: 1 });
userSchema.index({ "deviceTokens.token": 1 });

module.exports = mongoose.model("User", userSchema);
