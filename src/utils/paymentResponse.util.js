const UPLOADS_ROUTE_PREFIX = "/uploads";
const { buildAbsoluteUrl } = require("./publicUrl.util");

const toPlain = (value) => {
  if (value && typeof value.toObject === "function") {
    return value.toObject();
  }
  return value;
};

const buildProofUrl = (fileName, req) => {
  if (!fileName) {
    return null;
  }
  const cleanedFileName = String(fileName).replace(/^\/+/, "");
  return buildAbsoluteUrl(
    `${UPLOADS_ROUTE_PREFIX}/${encodeURIComponent(cleanedFileName)}`,
    req
  );
};

const normalizePaymentResponse = (payment, req) => {
  const value = toPlain(payment);
  if (!value || typeof value !== "object") {
    return value;
  }

  const transactionRef = value.transactionRef || value.utrNumber || null;
  const utrNumber = value.utrNumber || transactionRef;

  return {
    ...value,
    mode: value.mode || null,
    utrNumber: utrNumber || null,
    transactionRef,
    paymentAt: value.receivedAt || value.createdAt || null,
    proofUrl: buildProofUrl(value?.proofImage?.fileName, req),
    status: value.status || null
  };
};

module.exports = {
  normalizePaymentResponse
};
