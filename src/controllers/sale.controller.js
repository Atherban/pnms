const statusCode = require("../enums/statusCode");
const saleService = require("../services/sale.service");

// create sale
const createSale = async (req, res, next) => {
  try {
    const sale = await saleService.createSale(req.body);
    res.status(statusCode.CREATED).json({
      success: true,
      data: sale
    });
  } catch (error) {
    next(error);
  }
};

// get all sales
const getAllSales = async(req,res,next)=>{
  try {
    const sales = await saleService.getAllSales();
    res.status(statusCode.OK).json({
      success: true,
      data: sales
    })
  } catch (error) {
    next(error)
  }
}

// get sale by id
const getSalesById = async(req,res,next)=>{
  try {
    const sale = await saleService.getSalesById(req.params.id);
    res.status(statusCode.OK).json({
      success: true,
      data: sale
    });
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createSale,
  getAllSales,
  getSalesById
};
