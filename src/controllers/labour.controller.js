const statusCode = require("../enums/statusCode");
const labourService = require("../services/labour.service");

const createLabour = async (req, res, next) => {
  try {
    const labour = await labourService.createLabour(req.body);
    res.status(statusCode.CREATED).json({
      message: "Labour record created successfully",
      data: labour
    });
  } catch (err) {
    next(err);
  }
};

const getLabours = async (req, res, next) => {
  try {
    const labours = await labourService.getLabours();
    res.status(statusCode.OK).json({
      message: "Labour records retrieved successfully",
      data: labours
    });
  } catch (err) {
    next(err);
  }
};

const getLabourById = async (req, res, next) => {
  try {
    const labour = await labourService.getLabourById(req.params.id);
    res.status(statusCode.OK).json({
      message: "Labour record retrieved successfully",
      data: labour
    });
  } catch (err) {
    next(err);
  }
};

const updateLabour = async (req, res, next) => {
  try {
    const labour = await labourService.updateLabour(req.params.id, req.body);
    res.status(statusCode.OK).json({
      message: "Labour record updated successfully",
      data: labour
    });
  } catch (err) {
    next(err);
  }
};

const deleteLabour = async (req, res, next) => {
  try {
    const labour = await labourService.deleteLabour(req.params.id);
    res.status(statusCode.OK).json({
      message: "Labour record deleted successfully",
      data: labour
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createLabour,
  getLabours,
  getLabourById,
  updateLabour,
  deleteLabour
};
