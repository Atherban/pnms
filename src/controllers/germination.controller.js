const statusCode = require("../enums/statusCode");
const germinationService = require("../services/germination.service");

// Record germination
const recordGermination = async (req, res, next) => {
  try {
    const germination = await germinationService.recordGermination(
      req.body,
      req.user
    );
    res.status(statusCode.CREATED).json(germination);
  } catch (err) {
    next(err);
  }
};

// Get all germination records
const getGerminations = async (req, res, next) => {
  try {
    const records = await germinationService.getGerminations();
    res.status(statusCode.OK).json(records);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  recordGermination,
  getGerminations
};
