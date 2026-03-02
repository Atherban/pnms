const UPLOADS_ROUTE_PREFIX = "/uploads";

const toPlain = (value) => {
  if (value && typeof value.toObject === "function") {
    return value.toObject();
  }
  return value;
};

const buildFileUrl = (fileName, req) => {
  if (!fileName) return null;

  const path = `${UPLOADS_ROUTE_PREFIX}/${encodeURIComponent(String(fileName).replace(/^\/+/, ""))}`;
  const host = req?.get?.("host");
  if (!host) return path;
  return `${req.protocol}://${host}${path}`;
};

const normalizeNurserySettingsResponse = (nursery, req) => {
  const value = toPlain(nursery);
  if (!value || typeof value !== "object") return value;

  const output = { ...value };
  output.settings = { ...(value.settings || {}) };
  output.settings.paymentConfig = { ...(output.settings.paymentConfig || {}) };
  output.settings.contactDetails = Array.isArray(output.settings.contactDetails)
    ? output.settings.contactDetails.map((contact) => ({ ...contact }))
    : [];

  output.settings.paymentConfig.qrImageUrl = buildFileUrl(output.settings.paymentConfig.qrImage, req);
  output.settings.contactDetails = output.settings.contactDetails.map((contact) => ({
    ...contact,
    qrImageUrl: buildFileUrl(contact.qrImage, req)
  }));

  return output;
};

module.exports = {
  normalizeNurserySettingsResponse
};
