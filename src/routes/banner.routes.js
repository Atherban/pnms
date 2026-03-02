const express = require("express");
const router = express.Router();

const bannerController = require("../controllers/banner.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");
const validate = require("../middlewares/validate.middleware");
const { upload } = require("../middlewares/upload.middleware");
const { objectIdSchema } = require("../validations/common.validation");
const { createBannerSchema, updateBannerSchema } = require("../validations/banner.validation");

const attachBannerImageFileName = (req, res, next) => {
  if (req.file?.filename) {
    req.body.imageFileName = req.file.filename;
  }
  next();
};

router.post(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  upload.single("image"),
  attachBannerImageFileName,
  validate(createBannerSchema),
  bannerController.createBanner
);

router.get(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN", "STAFF", "CUSTOMER"),
  bannerController.getBanners
);

router.patch(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(objectIdSchema, "params"),
  upload.single("image"),
  attachBannerImageFileName,
  validate(updateBannerSchema),
  bannerController.updateBanner
);

router.delete(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(objectIdSchema, "params"),
  bannerController.deleteBanner
);

router.post(
  "/:id/image",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(objectIdSchema, "params"),
  upload.single("image"),
  bannerController.uploadBannerImage
);

router.delete(
  "/:id/image",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(objectIdSchema, "params"),
  bannerController.deleteBannerImage
);

module.exports = router;

