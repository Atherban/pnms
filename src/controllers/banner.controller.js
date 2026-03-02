const statusCode = require("../enums/statusCode");
const bannerService = require("../services/banner.service");
const ApiError = require("../exceptions/ApiError");
const { removeUploadedFile } = require("../utils/uploadFile.util");

const createBanner = async (req, res, next) => {
  try {
    const banner = await bannerService.createBanner(req.body, req.user);
    res.status(statusCode.CREATED).json({
      message: "Banner created successfully",
      data: banner
    });
  } catch (err) {
    if (req.file?.filename) {
      await removeUploadedFile(req.file.filename);
    }
    next(err);
  }
};

const getBanners = async (req, res, next) => {
  try {
    const banners = await bannerService.getBanners(req.user, req.query);
    res.status(statusCode.OK).json({
      message: "Banners retrieved successfully",
      data: banners
    });
  } catch (err) {
    next(err);
  }
};

const updateBanner = async (req, res, next) => {
  try {
    const banner = await bannerService.updateBanner(req.params.id, req.body, req.user);
    res.status(statusCode.OK).json({
      message: "Banner updated successfully",
      data: banner
    });
  } catch (err) {
    if (req.file?.filename) {
      await removeUploadedFile(req.file.filename);
    }
    next(err);
  }
};

const deleteBanner = async (req, res, next) => {
  try {
    const banner = await bannerService.deleteBanner(req.params.id, req.user);
    res.status(statusCode.OK).json({
      message: "Banner deleted successfully",
      data: banner
    });
  } catch (err) {
    next(err);
  }
};

const uploadBannerImage = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(statusCode.BAD_REQUEST, "Image file is required");
    }

    const banner = await bannerService.attachBannerImage(req.params.id, req.file, req.user);
    res.status(statusCode.OK).json({
      message: "Banner image uploaded successfully",
      data: banner
    });
  } catch (err) {
    if (req.file?.filename) {
      await removeUploadedFile(req.file.filename);
    }
    next(err);
  }
};

const deleteBannerImage = async (req, res, next) => {
  try {
    const banner = await bannerService.removeBannerImage(req.params.id, req.user);
    res.status(statusCode.OK).json({
      message: "Banner image removed successfully",
      data: banner
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createBanner,
  getBanners,
  updateBanner,
  uploadBannerImage,
  deleteBannerImage,
  deleteBanner
};
