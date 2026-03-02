const express = require("express");
const router = express.Router();

const nurseryController = require("../controllers/nursery.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");
const validate = require("../middlewares/validate.middleware");
const { upload } = require("../middlewares/upload.middleware");
const { objectIdSchema } = require("../validations/common.validation");
const {
  createNurserySchema,
  updateNurserySchema,
  updateNurseryPaymentConfigSchema,
  createPublicContactSchema,
  updatePublicContactSchema,
  assignAdminSchema,
  nurseryAdminParamsSchema,
  nurseryContactParamsSchema
} = require("../validations/nursery.validation");

router.post(
  "/",
  authenticate,
  authorize("SUPER_ADMIN"),
  validate(createNurserySchema),
  nurseryController.createNursery
);

router.get(
  "/",
  authenticate,
  authorize("SUPER_ADMIN"),
  nurseryController.getNurseries
);

router.get(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN", "STAFF", "CUSTOMER"),
  validate(objectIdSchema, "params"),
  nurseryController.getNurseryById
);

router.patch(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN"),
  validate(objectIdSchema, "params"),
  validate(updateNurserySchema),
  nurseryController.updateNursery
);

router.delete(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN"),
  validate(objectIdSchema, "params"),
  nurseryController.deleteNursery
);

router.patch(
  "/:id/payment-config",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(objectIdSchema, "params"),
  validate(updateNurseryPaymentConfigSchema),
  nurseryController.updateNurseryPaymentConfig
);

router.post(
  "/:id/payment-config/qr-image",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(objectIdSchema, "params"),
  upload.single("image"),
  nurseryController.uploadNurseryPaymentQr
);

router.post(
  "/:id/public-contacts",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(objectIdSchema, "params"),
  upload.single("image"),
  validate(createPublicContactSchema),
  nurseryController.addPublicContact
);

router.patch(
  "/:id/public-contacts/:contactId",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(nurseryContactParamsSchema, "params"),
  upload.single("image"),
  validate(updatePublicContactSchema),
  nurseryController.updatePublicContact
);

router.post(
  "/:id/public-contacts/:contactId/qr-image",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(nurseryContactParamsSchema, "params"),
  upload.single("image"),
  nurseryController.uploadPublicContactQr
);

router.delete(
  "/:id/public-contacts/:contactId",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(nurseryContactParamsSchema, "params"),
  nurseryController.removePublicContact
);

router.post(
  "/:id/admins",
  authenticate,
  authorize("SUPER_ADMIN"),
  validate(objectIdSchema, "params"),
  validate(assignAdminSchema),
  nurseryController.assignAdmin
);

router.get(
  "/:id/admins",
  authenticate,
  authorize("SUPER_ADMIN"),
  validate(objectIdSchema, "params"),
  nurseryController.getNurseryAdmins
);

router.delete(
  "/:id/admins/:adminId",
  authenticate,
  authorize("SUPER_ADMIN"),
  validate(nurseryAdminParamsSchema, "params"),
  nurseryController.removeNurseryAdmin
);

module.exports = router;
