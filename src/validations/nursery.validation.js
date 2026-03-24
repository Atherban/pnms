const Joi = require("joi");

const PHONE_PATTERN = /^\+?[1-9]\d{6,14}$/;

const paymentConfigSchema = Joi.object({
  upiId: Joi.string().trim().allow("", null).optional(),
  qrImage: Joi.string().trim().allow("", null).optional(),
  beneficiaryName: Joi.string().trim().max(120).allow("", null).optional(),
  bankName: Joi.string().trim().max(120).allow("", null).optional(),
  accountNumber: Joi.string().trim().max(34).allow("", null).optional(),
  ifscCode: Joi.string().trim().uppercase().pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/).allow("", null).optional(),
  paymentNotes: Joi.string().trim().max(500).allow("", null).optional()
}).optional();

const contactDetailSchema = Joi.object({
  label: Joi.string().trim().max(60).allow("", null).optional(),
  phoneNumber: Joi.string().trim().allow("", null).optional(),
  whatsappNumber: Joi.string().trim().allow("", null).optional(),
  email: Joi.string().email().allow("", null).optional(),
  address: Joi.string().trim().max(250).allow("", null).optional(),
  qrImage: Joi.string().trim().allow("", null).optional()
});

const createNurserySchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  code: Joi.string().trim().alphanum().min(3).max(20).uppercase().required(),
  status: Joi.string().valid("ACTIVE", "SUSPENDED").optional(),
  phoneNumber: Joi.string().trim().pattern(PHONE_PATTERN).allow("", null).optional(),
  settings: Joi.object({
    currency: Joi.string().trim().max(10).optional(),
    timezone: Joi.string().trim().max(120).optional(),
    paymentConfig: paymentConfigSchema,
    socialLinks: Joi.object({
      whatsapp: Joi.string().trim().allow("", null).optional(),
      facebook: Joi.string().uri().allow("", null).optional(),
      instagram: Joi.string().uri().allow("", null).optional(),
      youtube: Joi.string().uri().allow("", null).optional(),
      website: Joi.string().uri().allow("", null).optional()
    }).optional(),
    contactDetails: Joi.array().items(contactDetailSchema).optional()
  }).optional()
});

const updateNurserySchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).optional(),
  code: Joi.string().trim().alphanum().min(3).max(20).uppercase().optional(),
  status: Joi.string().valid("ACTIVE", "SUSPENDED").optional(),
  phoneNumber: Joi.string().trim().pattern(PHONE_PATTERN).allow("", null).optional(),
  settings: Joi.object({
    currency: Joi.string().trim().max(10).optional(),
    timezone: Joi.string().trim().max(120).optional(),
    paymentConfig: paymentConfigSchema,
    socialLinks: Joi.object({
      whatsapp: Joi.string().trim().allow("", null).optional(),
      facebook: Joi.string().uri().allow("", null).optional(),
      instagram: Joi.string().uri().allow("", null).optional(),
      youtube: Joi.string().uri().allow("", null).optional(),
      website: Joi.string().uri().allow("", null).optional()
    }).optional(),
    contactDetails: Joi.array().items(contactDetailSchema).optional()
  }).optional()
}).min(1);

const updateNurseryPaymentConfigSchema = Joi.object({
  upiId: Joi.string().trim().allow("", null).optional(),
  beneficiaryName: Joi.string().trim().max(120).allow("", null).optional(),
  bankName: Joi.string().trim().max(120).allow("", null).optional(),
  accountNumber: Joi.string().trim().max(34).allow("", null).optional(),
  ifscCode: Joi.string().trim().uppercase().pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/).allow("", null).optional(),
  paymentNotes: Joi.string().trim().max(500).allow("", null).optional()
}).min(1);

const createPublicContactSchema = Joi.object({
  label: Joi.string().trim().max(60).allow("", null).optional(),
  phoneNumber: Joi.string().trim().allow("", null).optional(),
  whatsappNumber: Joi.string().trim().allow("", null).optional(),
  email: Joi.string().email().allow("", null).optional(),
  address: Joi.string().trim().max(250).allow("", null).optional()
}).custom((value, helpers) => {
  if (!value.phoneNumber && !value.whatsappNumber && !value.email && !value.address) {
    return helpers.message("At least one public contact detail is required");
  }
  return value;
});

const updatePublicContactSchema = Joi.object({
  label: Joi.string().trim().max(60).allow("", null).optional(),
  phoneNumber: Joi.string().trim().allow("", null).optional(),
  whatsappNumber: Joi.string().trim().allow("", null).optional(),
  email: Joi.string().email().allow("", null).optional(),
  address: Joi.string().trim().max(250).allow("", null).optional()
}).min(1);

const assignAdminSchema = Joi.object({
  adminUserId: Joi.string().hex().length(24).required(),
  isPrimary: Joi.boolean().optional()
});

const nurseryAdminParamsSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
  adminId: Joi.string().hex().length(24).required()
});

const nurseryContactParamsSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
  contactId: Joi.string().hex().length(24).required()
});

module.exports = {
  createNurserySchema,
  updateNurserySchema,
  updateNurseryPaymentConfigSchema,
  createPublicContactSchema,
  updatePublicContactSchema,
  assignAdminSchema,
  nurseryAdminParamsSchema,
  nurseryContactParamsSchema
};
