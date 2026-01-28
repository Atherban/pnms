const express = require("express");
const router = express.Router();

const plantController = require("../controllers/plant.controller");
const { objectIdSchema } = require("../validations/common.validation");
const validate = require("../middlewares/validate.middleware");
const {
  createPlantSchema,
  updatePlantSchema,
  updateQuantitySchema,
} = require("../validations/plant.validation");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");

// Create plant
router.post("/",
  authenticate,
  authorize("ADMIN"), 
  validate(createPlantSchema), 
  plantController.createPlant);

// Get all plants
router.get("/",
  authenticate,
  authorize("ADMIN", "STAFF", "VIEWER"), 
  plantController.getPlants);

// Get plant by ID
router.get(
  "/:id",
  authenticate,
  authorize("ADMIN", "STAFF", "VIEWER"), 
  validate(objectIdSchema, "params"),
  plantController.getPlantById,
);

// Delete plant by ID
router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(objectIdSchema, "params"),
  plantController.deletePlantById,
);

// Update plant details
router.patch(
  "/:id",
  validate(objectIdSchema, "params"),
  validate(updatePlantSchema),
  plantController.updatePlantDetails,
);

// Update quantity
router.patch(
  "/:id/quantity",
  validate(objectIdSchema, "params"),
  validate(updateQuantitySchema),
  plantController.updateQuantity,
);

// Mark out of stock
router.patch(
  "/:id/out-of-stock",
  validate(objectIdSchema, "params"),
  plantController.markOutOfStock,
);

module.exports = router;
