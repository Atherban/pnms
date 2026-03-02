const statusCode = require("../enums/statusCode");
const paymentService = require("../services/payment.service");
const { removeUploadedFile } = require("../utils/uploadFile.util");

const createPayment = async (req, res, next) => {
  try {
    const payment = await paymentService.createPaymentRequest(req.body, req.user, req.file);
    res.status(statusCode.CREATED).json({
      message: "Payment created successfully",
      data: payment
    });
  } catch (err) {
    if (req.file?.filename) {
      await removeUploadedFile(req.file.filename);
    }
    next(err);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const payment = await paymentService.verifyPayment(
      req.params.id,
      req.body.action,
      req.body.rejectionReason,
      req.user,
      { ip: req.ip, userAgent: req.get("user-agent") }
    );

    res.status(statusCode.OK).json({
      message: `Payment ${req.body.action === "ACCEPT" ? "verified" : "rejected"} successfully`,
      data: payment
    });
  } catch (err) {
    next(err);
  }
};

const getPayments = async (req, res, next) => {
  try {
    const filters = { ...req.query };
    if (req.user.role !== "SUPER_ADMIN" && req.user.nurseryId) {
      filters.nurseryId = req.user.nurseryId;
    }
    const payments = await paymentService.getPayments(filters);
    res.status(statusCode.OK).json({
      message: "Payments retrieved successfully",
      data: payments
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createPayment,
  verifyPayment,
  getPayments
};
