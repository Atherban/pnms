const profitService = require("../services/profit.service");

const getProfitReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const report = await profitService.calculateProfit(
      startDate,
      endDate
    );

    res.status(200).json(report);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfitReport
};
