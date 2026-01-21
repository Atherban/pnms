const sowingService = require("../services/sowing.service");

const sowSeeds = async (req, res, next) => {
  try {
    const sowing = await sowingService.sowSeeds(req.body);
    res.status(201).json(sowing);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  sowSeeds
};
