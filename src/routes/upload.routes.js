const express = require("express");
const router = express.Router();

const upload = require("../middlewares/upload.middleware");
const fileController = require("../controllers/file.controller");
const validate = require("../middlewares/validate.middleware");
const { objectIdSchema } = require("../validations/common.validation");

router.post(
  "/plants/:id/image",
  validate(objectIdSchema, "params"),
  upload.single("image"),
  fileController.uploadPlantImage
);

module.exports = router;
