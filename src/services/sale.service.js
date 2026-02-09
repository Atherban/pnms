const mongoose = require("mongoose");
const Sale = require("../models/Sale.model");
const PlantInventory = require("../models/PlantInventory.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");

// CREATE SALE (Transactional, Inventory-based)
const createSale = async (data, user) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let totalAmount = 0;
    const saleItems = [];

    for (const item of data.items) {
      const inventory = await PlantInventory.findById(item.inventoryId)
        .populate("plantType")
        .session(session);

      if (!inventory) {
        throw new ApiError(
          statusCode.BAD_REQUEST,
          "Inventory item not found"
        );
      }

      if (inventory.quantity < item.quantity) {
        throw new ApiError(
          statusCode.BAD_REQUEST,
          "Insufficient inventory stock"
        );
      }

      const priceAtSale = inventory.plantType.sellingPrice;

      if (priceAtSale === undefined) {
        throw new ApiError(
          statusCode.INTERNAL_SERVER_ERROR,
          "Selling price not configured for plant type"
        );
      }

      // Reduce inventory
      inventory.quantity -= item.quantity;
      if (inventory.quantity === 0) {
        inventory.status = "OUT_OF_STOCK";
      }

      await inventory.save({ session });

      saleItems.push({
        inventory: inventory._id,
        quantity: item.quantity,
        priceAtSale
      });

      totalAmount += priceAtSale * item.quantity;
    }

    const [sale] = await Sale.create(
      [
        {
          items: saleItems,
          totalAmount,
          paymentMode: data.paymentMode,
          performedBy: user.userId,
          roleAtTime: user.role
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return sale;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};


// GET ALL SALES
const getAllSales = async () => {
  return Sale.find()
    .sort({ createdAt: -1 })
    .populate({
      path: "items.inventory",
      populate: { path: "plantType" }
    })
    .populate("customer", "name email");
};

// GET SALE BY ID
const getSaleById = async (saleId) => {
  const sale = await Sale.findById(saleId)
    .populate({
      path: "items.inventory",
      populate: { path: "plantType" }
    })
    .populate("customer", "name email");

  if (!sale) {
    throw new ApiError(statusCode.NOT_FOUND, "Sale not found");
  }

  return sale;
};

module.exports = {
  createSale,
  getAllSales,
  getSaleById
};
