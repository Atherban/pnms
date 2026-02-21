const statusCode = require("../enums/statusCode");
const seedService = require("../services/seed.service");
const ApiError = require("../exceptions/ApiError");

const createSeed = async (req, res, next) => {
  try {
    const seed = await seedService.createSeed(req.body, req.user);
    res.status(statusCode.CREATED).json({
      message: "Seed created successfully",
      data: seed
    });
  } catch (err) {
    next(err);
  }
};

const getSeeds = async (req, res, next) => {
  try {
    const seeds = await seedService.getAllSeeds();
    res.status(statusCode.OK).json({
      message: "Seeds retrieved successfully",
      data: seeds
    });
  } catch (err) {
    next(err);
  }
};

const getSeedById = async (req, res, next) => {
  try {
    const seed = await seedService.getSeedById(req.params.id);
    res.status(statusCode.OK).json({
      message: "Seed retrieved successfully",
      data: seed
    });
  } catch (err) {
    next(err);
  }
};

const updateSeedById = async (req, res, next) => {
  try {
    const seed = await seedService.updateSeedById(
      req.params.id,
      req.body,
      req.user
    );
    res.status(statusCode.OK).json({
      message: "Seed updated successfully",
      data: seed
    });
  } catch (err) {
    next(err);
  }
};

const deleteSeedById = async (req, res, next) => {
  try {
    const seed = await seedService.deleteSeedById(req.params.id);
    res.status(statusCode.OK).json({
      message: "Seed deleted successfully",
      data: seed
    });
  } catch (err) {
    next(err);
  }
};

const uploadSeedImage = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(statusCode.BAD_REQUEST, "Image file is required");
    }

    const seed = await seedService.attachSeedImage(
      req.params.id,
      req.file
    );

    res.status(statusCode.OK).json({
      message: "Seed image uploaded successfully",
      data: seed
    });
  } catch (err) {
    next(err);
  }
};

const removeSeedImage = async (req, res, next) => {
  try {
    const seed = await seedService.removeSeedImage(
      req.params.id,
      req.params.imageId
    );

    res.status(statusCode.OK).json({
      message: "Seed image removed successfully",
      data: seed
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSeed,
  getSeeds,
  getSeedById,
  updateSeedById,
  deleteSeedById,
  uploadSeedImage,
  removeSeedImage
};
