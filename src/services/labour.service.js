const Labour = require("../models/Labour.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");

const createLabour = async (payload) => {
  return Labour.create(payload);
};

const getLabours = async () => {
  return Labour.find().sort({ date: -1, createdAt: -1 });
};

const getLabourById = async (id) => {
  const labour = await Labour.findById(id);
  if (!labour) {
    throw new ApiError(statusCode.NOT_FOUND, "Labour record not found");
  }
  return labour;
};

const updateLabour = async (id, payload) => {
  const labour = await Labour.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true
  });

  if (!labour) {
    throw new ApiError(statusCode.NOT_FOUND, "Labour record not found");
  }

  return labour;
};

const deleteLabour = async (id) => {
  const labour = await Labour.findByIdAndDelete(id);
  if (!labour) {
    throw new ApiError(statusCode.NOT_FOUND, "Labour record not found");
  }
  return labour;
};

module.exports = {
  createLabour,
  getLabours,
  getLabourById,
  updateLabour,
  deleteLabour
};
