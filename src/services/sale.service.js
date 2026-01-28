const mongoose = require("mongoose");
const Sale = require("../models/Sale.model");
const Plant = require("../models/Plant.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");

// CREATE SALE (Transactional)
const createSale = async (data, user) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const saleItems = [];
    let totalAmount = 0;

    for (const item of data.items) {
      const plant = await Plant.findById(item.plantId).session(session);

      if (!plant) {
        throw new ApiError(statusCode.BAD_REQUEST, "Plant not found");
      }

      if (plant.isOutOfStock || plant.quantityAvailable < item.quantity) {
        throw new ApiError(
          statusCode.BAD_REQUEST,
          `Insufficient stock for ${plant.name}`
        );
      }

      // Update inventory
      plant.quantityAvailable -= item.quantity;
      if (plant.quantityAvailable === 0) {
        plant.isOutOfStock = true;
      }

      await plant.save({ session });

      saleItems.push({
        plantId: plant._id,
        quantity: item.quantity,
        priceAtSale: plant.price
      });

      totalAmount += plant.price * item.quantity;
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
    .populate("items.plantId", "name price")
    .populate("performedBy", "name email");
};

// GET SALE BY ID
const getSaleById = async (saleId) => {
  const sale = await Sale.findById(saleId)
    .populate("items.plantId", "name price")
    .populate("performedBy", "name email");

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
