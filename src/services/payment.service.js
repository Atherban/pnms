const mongoose = require("mongoose");
const Payment = require("../models/Payment.model");
const Sale = require("../models/Sale.model");
const FinancialLedgerEntry = require("../models/FinancialLedgerEntry.model");
const AuditLog = require("../models/AuditLog.model");
const CustomerSeedBatch = require("../models/CustomerSeedBatch.model");
const { upsertStaffAccount } = require("./staffAccount.service");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");
const Customer = require("../models/Customer.model");
const { normalizePaymentResponse } = require("../utils/paymentResponse.util");
const {
  createCustomerNotification,
  createRoleNotifications
} = require("./notification.service");

const PAYMENT_POPULATION = [
  { path: "saleId", select: "saleNumber totalAmount netAmount paidAmount dueAmount paymentStatus" },
  { path: "customerId", select: "name mobileNumber" },
  { path: "verifiedBy", select: "name role" }
];

const recalculateSalePaymentStatus = (sale) => {
  sale.dueAmount = Math.max((sale.netAmount || sale.totalAmount || 0) - (sale.paidAmount || 0), 0);
  if (sale.dueAmount === 0) {
    sale.paymentStatus = "PAID";
  } else if ((sale.paidAmount || 0) > 0) {
    sale.paymentStatus = "PARTIALLY_PAID";
  } else {
    sale.paymentStatus = "UNPAID";
  }
};

const normalizePaymentMode = (mode) => {
  const normalized = String(mode || "").trim().toUpperCase();
  return normalized === "BANK" ? "BANK_TRANSFER" : normalized;
};

const canAutoVerifyWalkInPayment = ({ sale, user, autoVerify }) => {
  if (!autoVerify) return false;
  const role = String(user?.role || "").toUpperCase();
  const isPrivilegedRole =
    role === "STAFF" || role === "NURSERY_ADMIN" || role === "SUPER_ADMIN";
  const isWalkInSale = !sale?.customer;
  return isPrivilegedRole && isWalkInSale;
};

const toValidDateOrUndefined = (value) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const createPaymentRequest = async (payload, user, file) => {
  const sale = await Sale.findOne({
    _id: payload.saleId,
    ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {})
  });
  if (!sale) {
    throw new ApiError(statusCode.NOT_FOUND, "Sale not found");
  }

  if (user.role === "CUSTOMER") {
    const customerProfile = await Customer.findOne({
      userId: user.userId,
      ...(user?.nurseryId ? { nurseryId: user.nurseryId } : {}),
      deletedAt: { $exists: false }
    }).select("_id");

    if (!customerProfile || String(sale.customer) !== String(customerProfile._id)) {
      throw new ApiError(statusCode.FORBIDDEN, "Cannot create payment for another customer sale");
    }
  }

  if (sale.isVoided) {
    throw new ApiError(statusCode.BAD_REQUEST, "Cannot add payment to a voided sale");
  }

  const pendingDue = Math.max((sale.netAmount || sale.totalAmount || 0) - (sale.paidAmount || 0), 0);
  if (payload.amount > pendingDue) {
    throw new ApiError(statusCode.BAD_REQUEST, "Payment amount exceeds due amount");
  }

  const normalizedUtr = String(payload.utrNumber || "").trim() || null;
  const normalizedTxRef = String(payload.transactionRef || "").trim() || null;
  const normalizedMode = normalizePaymentMode(payload.mode);

  if (normalizedMode !== "CASH" && !normalizedUtr) {
    throw new ApiError(statusCode.BAD_REQUEST, "utrNumber is required for UPI, ONLINE and BANK_TRANSFER payments");
  }

  const autoVerifyWalkIn = canAutoVerifyWalkInPayment({
    sale,
    user,
    autoVerify: Boolean(payload.autoVerify)
  });
  if (payload.autoVerify && !autoVerifyWalkIn) {
    throw new ApiError(
      statusCode.FORBIDDEN,
      "Auto-verify is allowed only for walk-in sale payments by staff/admin."
    );
  }

  const payment = await Payment.create({
    nurseryId: sale.nurseryId,
    saleId: sale._id,
    customerId: sale.customer || undefined,
    amount: payload.amount,
    mode: normalizedMode,
    status: autoVerifyWalkIn ? "VERIFIED" : "PENDING_VERIFICATION",
    utrNumber: normalizedUtr,
    transactionRef: normalizedTxRef || normalizedUtr,
    receivedAt: toValidDateOrUndefined(payload.paymentAt),
    proofImage: (file?.filename || payload.paymentProofFileName)
      ? {
          fileName: file?.filename || payload.paymentProofFileName,
          uploadedAt: new Date()
        }
      : undefined,
    verifiedBy: autoVerifyWalkIn ? user.userId : undefined,
    verifiedAt: autoVerifyWalkIn ? new Date() : undefined
  });

  if (payment.status === "VERIFIED") {
    sale.paidAmount = (sale.paidAmount || 0) + payment.amount;
    recalculateSalePaymentStatus(sale);
    sale.verificationStatus = "VERIFIED";
    sale.collectedBy = user.userId;
    await sale.save();

    await FinancialLedgerEntry.create({
      nurseryId: sale.nurseryId || null,
      entryType: "PAYMENT_VERIFIED",
      referenceType: "Payment",
      referenceId: payment._id,
      debit: 0,
      credit: payment.amount,
      balanceImpact: payment.amount,
      postedBy: user.userId,
      meta: {
        saleId: sale._id,
        saleNumber: sale.saleNumber || null,
        source: "payment_create_auto_verified"
      }
    });

    await upsertStaffAccount({
      nurseryId: sale.nurseryId || null,
      staffUserId: user.userId,
      staffRole: user.role,
      collectedDelta: payment.amount
    });

    if (sale.customerSeedBatch && (sale.dueAmount || 0) <= 0) {
      await CustomerSeedBatch.findByIdAndUpdate(sale.customerSeedBatch, {
        $set: { status: "CLOSED", updatedBy: user.userId }
      });
    }

    if (sale.customer) {
      await createCustomerNotification({
        nurseryId: sale.nurseryId,
        customerId: sale.customer,
        type: "PAYMENT_ACCEPTED",
        title: "Payment approved",
        message: `Payment of ${payment.amount} has been received and verified.`,
        meta: { saleId: sale._id, paymentId: payment._id }
      });

      if ((sale.dueAmount || 0) > 0) {
        await createCustomerNotification({
          nurseryId: sale.nurseryId,
          customerId: sale.customer,
          type: "PAYMENT_DUE",
          title: "Payment due",
          message: `Remaining due amount is ${sale.dueAmount}.`,
          meta: { saleId: sale._id, paymentId: payment._id, dueAmount: sale.dueAmount }
        });
      }
    }
  } else {
    sale.verificationStatus = "PENDING";
    await sale.save();
  }

  await AuditLog.create({
    nurseryId: sale.nurseryId || null,
    actorUserId: user.userId,
    action: "PAYMENT_REQUESTED",
    entityType: "Payment",
    entityId: payment._id,
    before: null,
    after: {
      saleId: sale._id,
      amount: payment.amount,
      mode: normalizedMode,
      status: payment.status
    },
    occurredAt: new Date()
  });

  if (payment.status === "PENDING_VERIFICATION") {
    await createRoleNotifications({
      nurseryId: sale.nurseryId,
      roles: ["NURSERY_ADMIN"],
      type: "PAYMENT_VERIFICATION_REQUIRED",
      title: "Payment verification required",
      message: `${sale.saleNumber || "Sale"} has a new payment proof for ${payment.amount}.`,
      meta: {
        saleId: String(sale._id),
        paymentId: String(payment._id),
        action: "VERIFY_PAYMENT"
      },
      createdBy: user.userId
    });
  }

  const createdPayment = await Payment.findById(payment._id).populate(PAYMENT_POPULATION);
  return normalizePaymentResponse(createdPayment);
};

const verifyPayment = async (paymentId, action, rejectionReason, user, reqMeta = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payment = await Payment.findById(paymentId).session(session);
    if (!payment) {
      throw new ApiError(statusCode.NOT_FOUND, "Payment not found");
    }

    if (payment.status !== "PENDING_VERIFICATION") {
      throw new ApiError(statusCode.BAD_REQUEST, "Payment is not pending verification");
    }

    const sale = await Sale.findById(payment.saleId).session(session);
    if (!sale) {
      throw new ApiError(statusCode.NOT_FOUND, "Sale not found for payment");
    }

    if (user.role !== "SUPER_ADMIN" && user.nurseryId && String(sale.nurseryId) !== String(user.nurseryId)) {
      throw new ApiError(statusCode.FORBIDDEN, "Cannot verify payment outside your nursery");
    }

    const now = new Date();

    if (action === "ACCEPT") {
      const pendingDue = Math.max((sale.netAmount || sale.totalAmount || 0) - (sale.paidAmount || 0), 0);
      if (payment.amount > pendingDue) {
        throw new ApiError(statusCode.BAD_REQUEST, "Payment amount exceeds current due amount");
      }

      const verifiedPayment = await Payment.findOneAndUpdate(
        {
          _id: payment._id,
          status: "PENDING_VERIFICATION"
        },
        {
          $set: {
            status: "VERIFIED",
            verifiedBy: user.userId,
            verifiedAt: now
          }
        },
        { new: true, session }
      );

      if (!verifiedPayment) {
        throw new ApiError(statusCode.CONFLICT, "Payment was already processed by another request");
      }

      payment.status = verifiedPayment.status;
      payment.verifiedBy = verifiedPayment.verifiedBy;
      payment.verifiedAt = verifiedPayment.verifiedAt;

      sale.paidAmount = (sale.paidAmount || 0) + payment.amount;
      recalculateSalePaymentStatus(sale);
      sale.verificationStatus = "VERIFIED";
      sale.collectedBy = user.userId;

      await FinancialLedgerEntry.create(
        [
          {
            nurseryId: sale.nurseryId,
            entryType: "PAYMENT_VERIFIED",
            referenceType: "Payment",
            referenceId: payment._id,
            debit: 0,
            credit: payment.amount,
            balanceImpact: payment.amount,
            postedBy: user.userId,
            meta: {
              saleId: sale._id,
              saleNumber: sale.saleNumber || null
            }
          }
        ],
        { session }
      );

      await upsertStaffAccount(
        {
          nurseryId: sale.nurseryId || null,
          staffUserId: user.userId,
          staffRole: user.role,
          collectedDelta: payment.amount
        },
        session
      );

      if (sale.customerSeedBatch && (sale.dueAmount || 0) <= 0) {
        await CustomerSeedBatch.findByIdAndUpdate(
          sale.customerSeedBatch,
          { $set: { status: "CLOSED", updatedBy: user.userId } },
          { session }
        );
      }

      if (sale.customer) {
        await createCustomerNotification({
          nurseryId: sale.nurseryId,
          customerId: sale.customer,
          type: "PAYMENT_ACCEPTED",
          title: "Payment approved",
          message: `Payment of ${payment.amount} has been approved.`,
          meta: { saleId: sale._id, paymentId: payment._id },
          session
        });

        if ((sale.dueAmount || 0) > 0) {
          await createCustomerNotification({
            nurseryId: sale.nurseryId,
            customerId: sale.customer,
            type: "PAYMENT_DUE",
            title: "Payment due",
            message: `Remaining due amount is ${sale.dueAmount}.`,
            meta: { saleId: sale._id, paymentId: payment._id, dueAmount: sale.dueAmount },
            session
          });
        }
      }
    } else {
      const rejectedPayment = await Payment.findOneAndUpdate(
        {
          _id: payment._id,
          status: "PENDING_VERIFICATION"
        },
        {
          $set: {
            status: "REJECTED",
            rejectionReason: rejectionReason || "Payment proof invalid",
            verifiedBy: user.userId,
            verifiedAt: now
          }
        },
        { new: true, session }
      );

      if (!rejectedPayment) {
        throw new ApiError(statusCode.CONFLICT, "Payment was already processed by another request");
      }

      payment.status = rejectedPayment.status;
      payment.rejectionReason = rejectedPayment.rejectionReason;
      payment.verifiedBy = rejectedPayment.verifiedBy;
      payment.verifiedAt = rejectedPayment.verifiedAt;

      sale.verificationStatus = "REJECTED";

      if (sale.customer) {
        await createCustomerNotification({
          nurseryId: sale.nurseryId,
          customerId: sale.customer,
          type: "PAYMENT_REJECTED",
          title: "Payment rejected",
          message: payment.rejectionReason,
          meta: { saleId: sale._id, paymentId: payment._id },
          session
        });
      }
    }

    await payment.save({ session });
    await sale.save({ session });

    await AuditLog.create(
      [
        {
          nurseryId: sale.nurseryId,
          actorUserId: user.userId,
          action: action === "ACCEPT" ? "PAYMENT_VERIFIED" : "PAYMENT_REJECTED",
          entityType: "Payment",
          entityId: payment._id,
          before: { status: "PENDING_VERIFICATION" },
          after: { status: payment.status, rejectionReason: payment.rejectionReason || null },
          ip: reqMeta.ip,
          userAgent: reqMeta.userAgent,
          occurredAt: new Date()
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    const verifiedPayment = await Payment.findById(paymentId).populate(PAYMENT_POPULATION);
    return normalizePaymentResponse(verifiedPayment);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const getPayments = async (filters = {}) => {
  const query = {};
  if (filters.saleId && mongoose.isValidObjectId(filters.saleId)) {
    query.saleId = filters.saleId;
  }
  if (filters.status) {
    query.status = String(filters.status).toUpperCase();
  }
  if (filters.nurseryId && mongoose.isValidObjectId(filters.nurseryId)) {
    query.nurseryId = filters.nurseryId;
  }
  const payments = await Payment.find(query).sort({ createdAt: -1 }).populate(PAYMENT_POPULATION);
  return payments.map(normalizePaymentResponse);
};

module.exports = {
  createPaymentRequest,
  verifyPayment,
  getPayments,
};
