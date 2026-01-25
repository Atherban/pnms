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

// Create plant
router.post("/", validate(createPlantSchema), plantController.createPlant);

// Get all plants
router.get("/", plantController.getPlants);

// Get plant by ID
router.get(
  "/:id",
  validate(objectIdSchema, "params"),
  plantController.getPlantById,
);

// Delete plant by ID
router.delete(
  "/:id",
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
