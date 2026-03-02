const Labour = require("../models/Labour.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");

const createLabour = async (payload, user) => {
  return Labour.create({
    ...payload,
    nurseryId: user.nurseryId || null
  });
};

const getLabours = async (user) => {
  const query = {};
  if (user?.role !== "SUPER_ADMIN" && user?.nurseryId) {
    query.nurseryId = user.nurseryId;
  }

  return Labour.find(query).sort({ date: -1, createdAt: -1 });
};

const getLabourById = async (id, user) => {
  const labour = await Labour.findOne({
    _id: id,
    ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {})
  });
  if (!labour) {
    throw new ApiError(statusCode.NOT_FOUND, "Labour record not found");
  }
  return labour;
};

const updateLabour = async (id, payload, user) => {
  const labour = await Labour.findOneAndUpdate({
    _id: id,
    ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {})
  }, payload, {
    new: true,
    runValidators: true
  });

  if (!labour) {
    throw new ApiError(statusCode.NOT_FOUND, "Labour record not found");
  }

  return labour;
};

const deleteLabour = async (id, user) => {
  const labour = await Labour.findOneAndDelete({
    _id: id,
    ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {})
  });
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
