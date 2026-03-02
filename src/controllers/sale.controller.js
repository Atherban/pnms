const saleService = require("../services/sale.service");
const statusCode = require("../enums/statusCode");

const createSale = async (req, res, next) => {
  try {
    const sale = await saleService.createSale(
      req.body,
      req.user
    );

    res.status(statusCode.CREATED).json(sale);
  } catch (err) {
    next(err);
  }
};

const getAllSales = async (req, res, next) => {
  try {
    const sales = await saleService.getAllSales(req.user);
    res.status(statusCode.OK).json(sales);
  } catch (err) {
    next(err);
  }
};

const getSaleById = async (req, res, next) => {
  try {
    const sale = await saleService.getSaleById(req.params.id, req.user);
    res.status(statusCode.OK).json(sale);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSale,
  getAllSales,
  getSaleById
};
