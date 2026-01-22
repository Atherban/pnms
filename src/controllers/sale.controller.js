const saleService = require("../services/sale.service");

const createSale = async (req, res, next) => {
  try {
    const sale = await saleService.createSale(req.body);
    res.status(201).json(sale);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSale
};
