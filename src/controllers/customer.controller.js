const statusCode = require("../enums/statusCode");
const customerService = require("../services/customer.service");

const createCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.createCustomer(req.body);
    res.status(statusCode.CREATED).json({
      message: "Customer created successfully",
      data: customer
    });
  } catch (err) {
    next(err);
  }
};

const getCustomers = async (req, res, next) => {
  try {
    const customers = await customerService.getCustomers();
    res.status(statusCode.OK).json({
      message: "Customers retrieved successfully",
      data: customers
    });
  } catch (err) {
    next(err);
  }
};

const getCustomerById = async (req, res, next) => {
  try {
    const customer = await customerService.getCustomerById(req.params.id);
    res.status(statusCode.OK).json({
      message: "Customer retrieved successfully",
      data: customer
    });
  } catch (err) {
    next(err);
  }
};

const updateCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.updateCustomer(req.params.id, req.body);
    res.status(statusCode.OK).json({
      message: "Customer updated successfully",
      data: customer
    });
  } catch (err) {
    next(err);
  }
};

const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.deleteCustomer(req.params.id);
    res.status(statusCode.OK).json({
      message: "Customer deleted successfully",
      data: customer
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer
};
