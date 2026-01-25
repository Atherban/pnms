const statusCode = require("../enums/statusCode");
const seedService = require("../services/seed.service");

const createSeed = async (req, res, next) => {
  try {
    const seed = await seedService.createSeed(req.body);
    res.status(statusCode.CREATED).json(seed);
  } catch (err) {
    next(err);
  }
};

const getSeeds = async (req, res, next) => {
  try {
    const seeds = await seedService.getAllSeeds();
    res.status(statusCode.OK).json(seeds);
  } catch (err) {
    next(err);
  }
};

const getSeedById = async (req, res, next) => {
  try {
    const seed = await seedService.getSeedById(req.params.id);
    res.status(statusCode.OK).json(seed);
  } catch (err) {
    next(err);
  }
};

const updateSeedById = async (req, res, next) => {
  try {
    const seed = await seedService.updateSeedById(
      req.params.id,
      req.body
    );
    res.status(statusCode.OK).json(seed);
  } catch (err) {
    next(err);
  }
};

const deleteSeedById = async (req, res, next) => {
  try {
    const seed = await seedService.deleteSeedById(req.params.id);
    res.status(statusCode.OK).json(seed);
  } catch (err) {
    next(err);
  }
};

const uploadSeedImage = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new Error("Image file is required");
    }

    const seed = await seedService.attachSeedImage(
      req.params.id,
      req.file
    );

    res.status(statusCode.OK).json({
      message: "Seed image uploaded successfully",
      seed
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
  uploadSeedImage
};
