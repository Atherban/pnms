const statusCode = require("../enums/statusCode");
const sowingService = require("../services/sowing.service");

// Create sowing record
const sowSeeds = async (req, res, next) => {
  try {
    const sowing = await sowingService.sowSeeds(
      req.body,
      req.user
    );
    res.status(statusCode.CREATED).json(sowing);
  } catch (err) {
    next(err);
  }
};

// Get all sowing records
const getSowings = async (req, res, next) => {
  try {
    const sowings = await sowingService.getSowings();
    res.status(statusCode.OK).json(sowings);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  sowSeeds,
  getSowings
};
