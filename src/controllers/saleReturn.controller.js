const statusCode = require("../enums/statusCode");
const saleReturnService = require("../services/saleReturn.service");

const createSaleReturn = async (req, res, next) => {
  try {
    const saleReturn = await saleReturnService.createSaleReturn(req.params.id, req.body, req.user);

    res.status(statusCode.CREATED).json({
      success: true,
      message: "Return request submitted successfully",
      data: saleReturn
    });
  } catch (err) {
    next(err);
  }
};

const listSaleReturns = async (req, res, next) => {
  try {
    const rows = await saleReturnService.listSaleReturns(req.query, req.user);
    res.status(statusCode.OK).json({
      success: true,
      message: "Returns fetched successfully",
      data: rows
    });
  } catch (err) {
    next(err);
  }
};

const getSaleReturnById = async (req, res, next) => {
  try {
    const row = await saleReturnService.getSaleReturnById(req.params.returnId, req.user);
    res.status(statusCode.OK).json({
      success: true,
      message: "Return fetched successfully",
      data: row
    });
  } catch (err) {
    next(err);
  }
};

const approveSaleReturn = async (req, res, next) => {
  try {
    const row = await saleReturnService.approveSaleReturn(req.params.returnId, req.user);
    res.status(statusCode.OK).json({
      success: true,
      message: "Return request approved",
      data: row
    });
  } catch (err) {
    next(err);
  }
};

const rejectSaleReturn = async (req, res, next) => {
  try {
    const row = await saleReturnService.rejectSaleReturn(req.params.returnId, req.body, req.user);
    res.status(statusCode.OK).json({
      success: true,
      message: "Return request rejected",
      data: row
    });
  } catch (err) {
    next(err);
  }
};

const completeSaleReturn = async (req, res, next) => {
  try {
    const row = await saleReturnService.completeSaleReturn(req.params.returnId, req.user);
    res.status(statusCode.OK).json({
      success: true,
      message: "Return processed successfully",
      data: row
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSaleReturn,
  listSaleReturns,
  getSaleReturnById,
  approveSaleReturn,
  rejectSaleReturn,
  completeSaleReturn
};
