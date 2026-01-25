const express = require("express");
const router = express.Router();

const seedController = require("../controllers/seed.controller");
const validate = require("../middlewares/validate.middleware");
const { createSeedSchema, updateSeedSchema } = require("../validations/seed.validation");
const { objectIdSchema } = require("../validations/common.validation");
const  seedUpload  = require("../middlewares/upload.middleware");

// Create seed
router.post("/", validate(createSeedSchema), seedController.createSeed);

// Get all seeds
router.get("/", seedController.getSeeds);

// Get seed by ID
router.get(
  "/:id",
  validate(objectIdSchema, "params"),
  seedController.getSeedById
);

// Update seed
router.patch(
  "/:id",
  validate(objectIdSchema, "params"),
  validate(updateSeedSchema),
  seedController.updateSeedById
);

// Delete seed
router.delete(
  "/:id",
  validate(objectIdSchema, "params"),
  seedController.deleteSeedById
);

// Upload seed image
router.post(
  "/:id/image",
  validate(objectIdSchema, "params"),
  seedUpload.single("image"),
  seedController.uploadSeedImage
);

module.exports = router;
