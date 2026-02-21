const mongoose = require("mongoose");
const PlantInventory = require("../models/PlantInventory.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");
const {
  createPurchasedInventory
} = require("../services/inventory.service");

const INVENTORY_POPULATION = [
  { path: "plantType", select: "name category variety sellingPrice images" },
  {
    path: "sourceRef",
    strictPopulate: false,
    populate: [
      {
        path: "sowingId",
        strictPopulate: false,
        populate: [
          { path: "seed", select: "name supplierName expiryDate images" },
          { path: "plantType", select: "name category variety sellingPrice images" }
        ]
      },
      {
        path: "inventoryBatch",
        strictPopulate: false,
        select: "quantity growthStage status receivedAt"
      },
      { path: "performedBy", strictPopulate: false, select: "name email role" }
    ]
  }
];

const createInventory = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { inventory } = await createPurchasedInventory(req.body, req.user, session);

    await session.commitTransaction();
    session.endSession();

    const populatedInventory = await PlantInventory.findById(inventory._id)
      .populate(INVENTORY_POPULATION);

    res.status(statusCode.CREATED).json({
      message: "Purchased inventory created successfully",
      data: populatedInventory
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

const getInventory = async (req, res, next) => {
  try {
    const inventory = await PlantInventory.find()
      .populate(INVENTORY_POPULATION)
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
      .populate(INVENTORY_POPULATION);

    if (!item) {
      throw new ApiError(statusCode.NOT_FOUND, "Inventory item not found");
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
  createInventory,
  getInventory,
  getInventoryById
};
