const express = require("express");
const router = express.Router();

const seedController = require("../controllers/seed.controller");
const validate = require("../middlewares/validate.middleware");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");

const {
  createSeedSchema,
  updateSeedSchema,
} = require("../validations/seed.validation");
const { objectIdSchema } = require("../validations/common.validation");
const { upload } = require("../middlewares/upload.middleware");

// Create seed batch (ADMIN)
router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createSeedSchema),
  seedController.createSeed
);

// Get all seeds (ALL ROLES)
router.get(
  "/",
  authenticate,
  authorize("ADMIN", "STAFF", "VIEWER"),
  seedController.getSeeds
);

// Get seed by ID (ALL ROLES)
router.get(
  "/:id",
  authenticate,
  authorize("ADMIN", "STAFF", "VIEWER"),
  validate(objectIdSchema, "params"),
  seedController.getSeedById
);

// Update seed details (ADMIN)
router.patch(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(objectIdSchema, "params"),
  validate(updateSeedSchema),
  seedController.updateSeedById
);

// Delete seed (soft delete, ADMIN)
router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(objectIdSchema, "params"),
  seedController.deleteSeedById
);

// Upload seed image (ADMIN)
router.post(
  "/:id/image",
  authenticate,
  authorize("ADMIN"),
  validate(objectIdSchema, "params"),
  upload.single("image"),
  seedController.uploadSeedImage
);

module.exports = router;
