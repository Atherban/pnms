const mongoose = require("mongoose");
const PlantInventory = require("../models/PlantInventory.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");
const {
  createPurchasedInventory
} = require("../services/inventory.service");
const {
  getCustomerAccessibleInventoryIds
} = require("../services/accessScope.service");

const INVENTORY_POPULATION = [
  {
    path: "plantType",
    select: "name category variety sellingPrice images expectedSeedQtyPerBatch expectedSeedUnit"
  },
  {
    path: "sourceRef",
    strictPopulate: false,
    populate: [
      {
        path: "sowingId",
        strictPopulate: false,
        populate: [
          { path: "seed", select: "name supplierName expiryDate images" },
          {
            path: "plantType",
            select: "name category variety sellingPrice images expectedSeedQtyPerBatch expectedSeedUnit"
          },
          {
            path: "customerSeedBatch",
            select: "seedQuantity seedsSown seedsGerminated seedsDiscarded status estimatedPickupDate"
          }
        ]
      },
      {
        path: "inventoryBatch",
        strictPopulate: false,
        select: "quantity growthStage status receivedAt"
      },
      {
        path: "saleId",
        strictPopulate: false,
        select: "saleNumber status paymentStatus totalAmount dueAmount"
      },
      { path: "performedBy", strictPopulate: false, select: "name email role" }
    ]
  },
  { path: "customerId", select: "name mobileNumber" },
  {
    path: "customerSeedBatch",
    select: "seedQuantity seedsSown seedsGerminated seedsDiscarded status estimatedPickupDate"
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
    const query = {};
    if (req.user.role !== "SUPER_ADMIN" && req.user.nurseryId) {
      query.nurseryId = req.user.nurseryId;
    }

    if (req.user.role === "CUSTOMER") {
      const inventoryIds = await getCustomerAccessibleInventoryIds(req.user);
      query._id = { $in: inventoryIds };
    }

    const inventory = await PlantInventory.find(query)
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
    const query = { _id: req.params.id };
    if (req.user.role !== "SUPER_ADMIN" && req.user.nurseryId) {
      query.nurseryId = req.user.nurseryId;
    }

    if (req.user.role === "CUSTOMER") {
      const inventoryIds = await getCustomerAccessibleInventoryIds(req.user);
      if (!inventoryIds.some((id) => id.toString() === req.params.id)) {
        throw new ApiError(statusCode.NOT_FOUND, "Inventory item not found");
      }
    }

    const item = await PlantInventory.findOne(query)
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
