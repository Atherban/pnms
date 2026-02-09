const express = require("express");
const router = express.Router();

const plantTypeController = require("../controllers/plantType.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");
const validate = require("../middlewares/validate.middleware");
const { upload } = require("../middlewares/upload.middleware");
const { createPlantTypeSchema } = require("../validations/plantType.validation");
const { objectIdSchema } = require("../validations/common.validation");

// Create PlantType (ADMIN)
router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createPlantTypeSchema),
  plantTypeController.createPlantType
);

// Get all PlantTypes
router.get(
  "/",
  authenticate,
  authorize("ADMIN", "STAFF", "VIEWER"),
  plantTypeController.getPlantTypes
);

// Upload PlantType image (ADMIN)
router.post(
  "/:id/image",
  authenticate,
  authorize("ADMIN"),
  validate(objectIdSchema, "params"),
  upload.single("image"),
  plantTypeController.uploadPlantTypeImage
);

module.exports = router;
