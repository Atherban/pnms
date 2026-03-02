const mongoose = require("mongoose");

const nurserySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    ownerSuperAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED"],
      default: "ACTIVE"
    },
    settings: {
      currency: {
        type: String,
        default: "INR"
      },
      timezone: {
        type: String,
        default: "Asia/Kolkata"
      },
      paymentConfig: {
        upiId: String,
        qrImage: String,
        beneficiaryName: String,
        bankName: String,
        accountNumber: String,
        ifscCode: String,
        paymentNotes: String
      },
      socialLinks: {
        whatsapp: String,
        facebook: String,
        instagram: String,
        youtube: String,
        website: String
      },
      contactDetails: [
        {
          label: String,
          phoneNumber: String,
          whatsappNumber: String,
          email: String,
          address: String,
          qrImage: String
        }
      ],
      notificationConfig: {
        dueReminderEveryDays: {
          type: Number,
          min: 1,
          max: 365
        }
      }
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    deletedReason: {
      type: String
    },
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

nurserySchema.index({ status: 1 });
nurserySchema.index({ name: 1 });

module.exports = mongoose.model("Nursery", nurserySchema);
