const mongoose = require("mongoose");
const Sale = require("../models/Sale.model");
const PlantInventory = require("../models/PlantInventory.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");
const { deductInventoryFIFO } = require("./inventory.service");

const SALE_POPULATION = [
  {
    path: "items.inventory",
    populate: { path: "plantType", select: "name category variety sellingPrice" }
  },
  {
    path: "items.batchDeductions.inventory",
    populate: { path: "plantType", select: "name category variety sellingPrice" }
  },
  { path: "customer", select: "name mobileNumber" },
  { path: "performedBy", select: "name email role" }
];

const createSale = async (data, user) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let totalAmount = 0;
    let totalCost = 0;
    const saleItems = [];

    for (const item of data.items) {
      const requestedInventory = await PlantInventory.findById(item.inventoryId)
        .populate("plantType")
        .session(session);

      if (!requestedInventory) {
        throw new ApiError(statusCode.BAD_REQUEST, "Inventory item not found");
      }

      const priceAtSale = requestedInventory.plantType.sellingPrice;
      if (priceAtSale === undefined || priceAtSale === null) {
        throw new ApiError(
          statusCode.INTERNAL_SERVER_ERROR,
          "Selling price not configured for plant type"
        );
      }

      // Deduct by oldest available stock for the same plant type (FIFO by batch).
      const deductions = await deductInventoryFIFO(
        {
          plantTypeId: requestedInventory.plantType._id,
          quantity: item.quantity
        },
        session
      );

      // Capture COGS snapshot so profit remains immutable even if costs change later.
      const itemCost = deductions.reduce(
        (sum, deduction) => sum + deduction.quantity * deduction.unitCost,
        0
      );
      const itemRevenue = priceAtSale * item.quantity;
      const itemProfit = itemRevenue - itemCost;

      saleItems.push({
        inventory: requestedInventory._id,
        quantity: item.quantity,
        priceAtSale,
        costAtSale: itemCost,
        profit: itemProfit,
        batchDeductions: deductions
      });

      totalAmount += itemRevenue;
      totalCost += itemCost;
    }

    const totalProfit = totalAmount - totalCost;
    const grossMarginPercent = totalAmount
      ? Number(((totalProfit / totalAmount) * 100).toFixed(2))
      : 0;

    const [sale] = await Sale.create(
      [
        {
          customer: data.customer,
          items: saleItems,
          totalAmount,
          totalCost,
          totalProfit,
          grossMarginPercent,
          paymentMode: data.paymentMode,
          performedBy: user.userId,
          roleAtTime: user.role
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return Sale.findById(sale._id).populate(SALE_POPULATION);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const getAllSales = async () => {
  return Sale.find()
    .sort({ createdAt: -1 })
    .populate(SALE_POPULATION);
};

const getSaleById = async (saleId) => {
  const sale = await Sale.findById(saleId)
    .populate(SALE_POPULATION);

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
