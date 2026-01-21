const seedService = require("../services/seed.service");

// Create a new seed
const createSeed = async (req, res, next) => {
  try {
    const seed = await seedService.createSeed(req.body);
    res.status(201).json(seed);
  } catch (err) {
    next(err);
  }
};

// Get all seeds
const getSeeds = async (req, res, next) => {
  try {
    const seeds = await seedService.getAllSeeds();
    res.status(200).json(seeds);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSeed,
  getSeeds
};
