const statusCode = require("../enums/statusCode");
const customerService = require("../services/customer.service");

const createCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.createCustomer(req.body, req.user);
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
    const customers = await customerService.getCustomers(req.user);
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
    const customer = await customerService.getCustomerById(req.params.id, req.user);
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
    const customer = await customerService.updateCustomer(req.params.id, req.body, req.user);
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
    const customer = await customerService.deleteCustomer(req.params.id, req.user);
    res.status(statusCode.OK).json({
      message: "Customer deleted successfully",
      data: customer
    });
  } catch (err) {
    next(err);
  }
};

const getMyProfile = async (req, res, next) => {
  try {
    const profile = await customerService.getMyProfile(req.user);
    res.status(statusCode.OK).json({
      message: "Customer profile retrieved successfully",
      data: profile
    });
  } catch (err) {
    next(err);
  }
};

const updateMyProfile = async (req, res, next) => {
  try {
    const profile = await customerService.updateMyProfile(req.user, req.body);
    res.status(statusCode.OK).json({
      message: "Customer profile updated successfully",
      data: profile
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
  deleteCustomer,
  getMyProfile,
  updateMyProfile
};
