const profitService = require("../services/profit.service");
const statusCode = require("../enums/statusCode");

const getProfit = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const report = await profitService.calculateProfit(
      startDate,
      endDate
    );

    res.status(statusCode.OK).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfit
};
