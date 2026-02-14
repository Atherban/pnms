const Customer = require("../models/Customer.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");

const createCustomer = async (payload) => {
  const exists = await Customer.findOne({ mobileNumber: payload.mobileNumber });
  if (exists) {
    throw new ApiError(statusCode.CONFLICT, "Customer already exists");
  }

  return Customer.create(payload);
};

const getCustomers = async () => {
  return Customer.find().sort({ createdAt: -1 });
};

const getCustomerById = async (id) => {
  const customer = await Customer.findById(id);
  if (!customer) {
    throw new ApiError(statusCode.NOT_FOUND, "Customer not found");
  }
  return customer;
};

const updateCustomer = async (id, payload) => {
  if (payload.mobileNumber) {
    const exists = await Customer.findOne({
      mobileNumber: payload.mobileNumber,
      _id: { $ne: id }
    });

    if (exists) {
      throw new ApiError(statusCode.CONFLICT, "Customer already exists");
    }
  }

  const customer = await Customer.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true
  });

  if (!customer) {
    throw new ApiError(statusCode.NOT_FOUND, "Customer not found");
  }

  return customer;
};

const deleteCustomer = async (id) => {
  const customer = await Customer.findByIdAndDelete(id);
  if (!customer) {
    throw new ApiError(statusCode.NOT_FOUND, "Customer not found");
  }
  return customer;
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer
};
