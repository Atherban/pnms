const toPlain = (value) => {
  if (value && typeof value.toObject === "function") {
    return value.toObject();
  }
  return value;
};

const asStringId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value._id) return String(value._id);
  if (typeof value.toString === "function") return String(value);
  return null;
};

const extractPhone = (value) => {
  if (!value || typeof value !== "object") return null;
  return value.phoneNumber || value.mobileNumber || null;
};

const buildCustomerIdentity = (customerValue) => {
  const customerObj = toPlain(customerValue);
  const customerId = asStringId(customerObj);
  const customerPhone = extractPhone(customerObj);
  const customerName =
    customerObj && typeof customerObj === "object"
      ? customerObj.name || customerObj.fullName || null
      : null;

  const customer = customerId || customerPhone
    ? {
        _id: customerId,
        phoneNumber: customerPhone,
        ...(customerName ? { name: customerName } : {})
      }
    : null;

  return {
    customerId,
    customerPhone,
    customerName,
    customer
  };
};

const normalizeSaleCustomer = (sale) => {
  const value = toPlain(sale);
  if (!value || typeof value !== "object") return value;

  const identity = buildCustomerIdentity(value.customer);
  return {
    ...value,
    customerId: identity.customerId,
    customerPhone: identity.customerPhone,
    ...(identity.customerName ? { customerName: identity.customerName } : {}),
    customer: identity.customer
  };
};

const normalizeSowingCustomer = (sowing) => {
  const value = toPlain(sowing);
  if (!value || typeof value !== "object") return value;

  const identity = buildCustomerIdentity(value.customerId);
  return {
    ...value,
    customerId: identity.customerId,
    customerPhone: identity.customerPhone,
    customer: identity.customer
  };
};

const normalizeGerminationCustomer = (germination) => {
  const value = toPlain(germination);
  if (!value || typeof value !== "object") return value;

  const identity = buildCustomerIdentity(value?.sowingId?.customerId);
  return {
    ...value,
    customerId: identity.customerId,
    customerPhone: identity.customerPhone,
    customer: identity.customer
  };
};

module.exports = {
  normalizeSaleCustomer,
  normalizeSowingCustomer,
  normalizeGerminationCustomer
};
