const statusCode = require("../enums/statusCode");
const saleReturnService = require("../services/saleReturn.service");

const createSaleReturn = async (req, res, next) => {
  try {
    const saleReturn = await saleReturnService.createSaleReturn(
      req.params.id,
      req.body,
      req.user
    );

    res.status(statusCode.CREATED).json({
      message: "Sale return processed successfully",
      data: saleReturn
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSaleReturn
};
