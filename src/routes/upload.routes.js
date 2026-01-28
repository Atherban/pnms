const express = require("express");
const router = express.Router();

const fileController = require("../controllers/file.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");
const validate = require("../middlewares/validate.middleware");
const { objectIdSchema } = require("../validations/common.validation");
const { upload } = require("../middlewares/upload.middleware");

// Upload plant image
router.post(
  "/plants/:id/image",
  authenticate,
  authorize("ADMIN"),
  validate(objectIdSchema, "params"),
  upload.single("image"),
  fileController.uploadPlantImage
);

module.exports = router;
