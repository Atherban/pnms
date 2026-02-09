const PlantInventory = require("../models/PlantInventory.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");

const getInventory = async (req, res, next) => {
  try {
    const inventory = await PlantInventory.find()
      .populate("plantType")
      .sort({ createdAt: -1 });

    res.status(statusCode.OK).json({
      message: "Inventory retrieved successfully",
      data: inventory
    });
  } catch (err) {
    next(err);
  }
};

const getInventoryById = async (req, res, next) => {
  try {
    const item = await PlantInventory.findById(req.params.id)
      .populate("plantType");

    if (!item) {
      throw new ApiError(404, "Inventory item not found");
    }

    res.status(statusCode.OK).json({
      message: "Inventory item retrieved successfully",
      data: item
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getInventory,
  getInventoryById
};
