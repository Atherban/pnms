const mongoose = require("mongoose");
const Sale = require("../models/Sale.model");
const Plant = require("../models/Plant.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");

// create sale
const createSale = async (data) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const saleItems = [];

    for (const item of data.items) {
      const plant = await Plant.findById(item.plantId).session(session);

      if (!plant) {
        throw new ApiError(statusCode.BAD_REQUEST, "Plant not found");
      }

      if (plant.quantityAvailable < item.quantity) {
        throw new ApiError(
          statusCode.BAD_REQUEST,
          `Insufficient stock for ${plant.name}`
        );
      }

      plant.quantityAvailable -= item.quantity;
      plant.status =
        plant.quantityAvailable === 0 ? "OUT_OF_STOCK" : "AVAILABLE";

      await plant.save({ session });

      saleItems.push({
        plant: plant._id,
        quantity: item.quantity,
        priceAtSale: plant.price
      });
    }

    const sale = await Sale.create(
      [
        {
          customer: data.customerId,
          items: saleItems,
          paymentMode: data.paymentMode
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return sale[0];
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// get all sales
const getAllSales = async()=>{
  return await Sale.find()
  .sort({ createdAt: -1 })
  .populate('items.plantId')
  .populate('customer')
}

// get sale by ID
const getSalesById = async(saleId) =>{

  const sale = await Sale.findById(saleId)
  .populate('customer', "name email", 'items.plantId');

  if(!sale){
    throw new ApiError(statusCode.NOT_FOUND, "Sale not found")
  }
  return sale;
}

module.exports = {
  createSale,
  getAllSales,
  getSalesById
};
