const Joi = require("joi");
const SOFT_DELETE_COLLECTIONS = [
  "users",
  "nurseries",
  "customers",
  "expenses",
  "plantTypes",
  "seeds"
];

const purgeSoftDeleteSchema = Joi.object({
  retentionDays: Joi.number().integer().min(1).max(365).default(30),
  nurseryId: Joi.string().trim().hex().length(24).optional()
});

const listSoftDeletedItemsSchema = Joi.object({
  nurseryId: Joi.string().trim().hex().length(24).optional(),
  collection: Joi.string().valid(...SOFT_DELETE_COLLECTIONS).optional(),
  limit: Joi.number().integer().min(1).max(500).default(100)
});

const hardDeleteSoftDeletedSchema = Joi.object({
  nurseryId: Joi.string().trim().hex().length(24).optional(),
  collection: Joi.string().valid(...SOFT_DELETE_COLLECTIONS).required(),
  ids: Joi.array().items(Joi.string().trim().hex().length(24)).min(1).max(500).required()
});

module.exports = {
  purgeSoftDeleteSchema,
  listSoftDeletedItemsSchema,
  hardDeleteSoftDeletedSchema
};
