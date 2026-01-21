const germinationService = require("../services/germination.service");

const recordGermination = async (req, res, next) => {
  try {
    const record = await germinationService.recordGermination(req.body);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  recordGermination
};
