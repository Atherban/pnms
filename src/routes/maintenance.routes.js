const express = require("express");
const router = express.Router();

const maintenanceController = require("../controllers/maintenance.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");
const validate = require("../middlewares/validate.middleware");
const {
  purgeSoftDeleteSchema,
  listSoftDeletedItemsSchema,
  hardDeleteSoftDeletedSchema
} = require("../validations/maintenance.validation");

router.post(
  "/soft-delete/purge",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(purgeSoftDeleteSchema),
  maintenanceController.purgeSoftDeleted
);

router.get(
  "/soft-delete/items",
  authenticate,
  authorize("SUPER_ADMIN"),
  validate(listSoftDeletedItemsSchema, "query"),
  maintenanceController.listSoftDeletedItems
);

router.post(
  "/soft-delete/hard-delete",
  authenticate,
  authorize("SUPER_ADMIN"),
  validate(hardDeleteSoftDeletedSchema),
  maintenanceController.hardDeleteSoftDeletedItems
);

module.exports = router;
