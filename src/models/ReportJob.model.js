const mongoose = require("mongoose");

const reportJobSchema = new mongoose.Schema(
  {
    nurseryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nursery"
    },
    reportType: {
      type: String,
      enum: [
        "SALES",
        "PAYMENT_DUES",
        "INVENTORY",
        "STAFF_ACCOUNTING",
        "EXPENSES",
        "PROFITABILITY"
      ],
      required: true
    },
    filters: {
      type: Object,
      default: {}
    },
    format: {
      type: String,
      enum: ["PDF", "XLSX"],
      required: true
    },
    status: {
      type: String,
      enum: ["QUEUED", "PROCESSING", "READY", "FAILED"],
      default: "READY"
    },
    file: {
      name: String,
      mimeType: String,
      contentBase64: String
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

reportJobSchema.index({ nurseryId: 1, reportType: 1, createdAt: -1 });

module.exports = mongoose.model("ReportJob", reportJobSchema);
