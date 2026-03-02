export type FieldErrors<T extends string = string> = Partial<Record<T, string>>;

const isBlank = (v: unknown) => v == null || String(v).trim() === "";
const isObjectId = (v: string) => /^[a-fA-F0-9]{24}$/.test(v);
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isPhone = (v: string) => /^(?:\+91|91)?[6-9]\d{9}$/.test(v);
const isStrongPassword = (v: string) => String(v || "").length >= 8;
const isIsoDate = (v: string) => !Number.isNaN(Date.parse(v));

export const validateLogin = (input: { email?: string; phoneNumber?: string; password?: string }) => {
  const errors: FieldErrors<"email" | "phoneNumber" | "password"> = {};

  if (isBlank(input.email) && isBlank(input.phoneNumber)) {
    errors.email = "Email or phone number is required";
  }

  if (!isBlank(input.email) && !isEmail(String(input.email))) {
    errors.email = "Invalid email format";
  }

  if (!isBlank(input.phoneNumber) && !isPhone(String(input.phoneNumber))) {
    errors.phoneNumber = "Invalid phone number format";
  }

  if (!isStrongPassword(String(input.password || ""))) {
    errors.password = "Password must be at least 8 characters";
  }

  return errors;
};

export const validateCreatePlantType = (input: {
  name?: string;
  category?: string;
  lifecycleDays?: number;
  sellingPrice?: number;
  expectedSeedQtyPerBatch?: number;
}) => {
  const errors: FieldErrors<
    "name" | "category" | "lifecycleDays" | "sellingPrice" | "expectedSeedQtyPerBatch"
  > = {};

  if (isBlank(input.name)) errors.name = "Name is required";
  if (!input.category || !["VEGETABLE", "FLOWER", "FRUIT", "HERB"].includes(input.category)) {
    errors.category = "Category must be one of VEGETABLE, FLOWER, FRUIT, HERB";
  }
  if (!Number.isInteger(input.lifecycleDays) || Number(input.lifecycleDays) <= 0) {
    errors.lifecycleDays = "Lifecycle days must be a positive integer";
  }
  if (!(Number(input.sellingPrice) > 0)) errors.sellingPrice = "Selling price must be greater than 0";
  if (!Number.isInteger(input.expectedSeedQtyPerBatch) || Number(input.expectedSeedQtyPerBatch) <= 0) {
    errors.expectedSeedQtyPerBatch = "Expected seed quantity per batch is required and must be > 0";
  }

  return errors;
};

export const validateCreateSeed = (input: {
  name?: string;
  plantType?: string;
  supplierName?: string;
  totalPurchased?: number;
  purchaseDate?: string;
  expiryDate?: string;
}) => {
  const errors: FieldErrors<
    "name" | "plantType" | "supplierName" | "totalPurchased" | "purchaseDate" | "expiryDate"
  > = {};

  if (isBlank(input.name)) errors.name = "Name is required";
  if (!input.plantType || !isObjectId(input.plantType)) errors.plantType = "Valid plant type is required";
  if (isBlank(input.supplierName)) errors.supplierName = "Supplier name is required";
  if (!Number.isInteger(input.totalPurchased) || Number(input.totalPurchased) < 1) {
    errors.totalPurchased = "Total purchased must be at least 1";
  }
  if (!input.purchaseDate || !isIsoDate(input.purchaseDate)) errors.purchaseDate = "Valid purchase date is required";
  if (!input.expiryDate || !isIsoDate(input.expiryDate)) {
    errors.expiryDate = "Valid expiry date is required";
  } else if (input.purchaseDate && Date.parse(input.expiryDate) <= Date.parse(input.purchaseDate)) {
    errors.expiryDate = "Expiry date must be after purchase date";
  }

  return errors;
};

export const validateCreateSowing = (input: { seedId?: string; quantity?: number; customerId?: string }) => {
  const errors: FieldErrors<"seedId" | "quantity" | "customerId"> = {};

  if (!input.seedId || !isObjectId(input.seedId)) errors.seedId = "Valid seed is required";
  if (!Number.isInteger(input.quantity) || Number(input.quantity) < 1) {
    errors.quantity = "Quantity must be at least 1";
  }
  if (input.customerId && !isObjectId(input.customerId)) errors.customerId = "Invalid customer ID";

  return errors;
};

export const validateCreatePayment = (input: {
  saleId?: string;
  amount?: number;
  mode?: string;
  transactionRef?: string;
}) => {
  const errors: FieldErrors<"saleId" | "amount" | "mode" | "transactionRef"> = {};

  if (!input.saleId || !isObjectId(input.saleId)) errors.saleId = "Valid sale ID is required";
  if (!(Number(input.amount) > 0)) errors.amount = "Amount must be greater than 0";
  if (!input.mode || !["CASH", "UPI", "ONLINE", "BANK_TRANSFER"].includes(input.mode)) {
    errors.mode = "Invalid payment mode";
  }
  if (input.transactionRef && String(input.transactionRef).length > 400) {
    errors.transactionRef = "Transaction reference is too long";
  }

  return errors;
};

export const validatePaymentVerification = (input: { action?: string; rejectionReason?: string }) => {
  const errors: FieldErrors<"action" | "rejectionReason"> = {};

  if (!input.action || !["ACCEPT", "REJECT"].includes(input.action)) {
    errors.action = "Action must be ACCEPT or REJECT";
  }

  if (input.action === "REJECT" && isBlank(input.rejectionReason)) {
    errors.rejectionReason = "Rejection reason is required when action is REJECT";
  }

  return errors;
};

export const validateCreateUser = (input: {
  name?: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
  role?: string;
  nurseryId?: string;
}) => {
  const errors: FieldErrors<"name" | "email" | "phoneNumber" | "password" | "role" | "nurseryId"> = {};

  if (isBlank(input.name)) errors.name = "Name is required";
  if (isBlank(input.email) && isBlank(input.phoneNumber)) {
    errors.email = "Email or phone number is required";
  }
  if (!isBlank(input.email) && !isEmail(String(input.email))) errors.email = "Invalid email";
  if (!isBlank(input.phoneNumber) && !isPhone(String(input.phoneNumber))) {
    errors.phoneNumber = "Invalid phone number";
  }

  const role = String(input.role || "");
  if (!["SUPER_ADMIN", "NURSERY_ADMIN", "STAFF", "CUSTOMER"].includes(role)) {
    errors.role = "Invalid role";
  }

  const minPasswordLength = role === "CUSTOMER" ? 5 : 8;
  if (!input.password || String(input.password).length < minPasswordLength) {
    errors.password = `Password must be at least ${minPasswordLength} characters`;
  }

  if (input.nurseryId && !isObjectId(input.nurseryId)) errors.nurseryId = "Invalid nursery ID";

  return errors;
};
