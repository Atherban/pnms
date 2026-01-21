const plantService = require("../services/plant.service");


// Create plant

const createPlant = async (req, res, next) => {
  try {
    const plant = await plantService.createPlant(req.body);
    res.status(201).json(plant);
  } catch (error) {
    next(error);
  }
};


// Get all plants
 
const getPlants = async (req, res, next) => {
  try {
    const plants = await plantService.getAllPlants();
    res.status(200).json(plants);
  } catch (error) {
    next(error);
  }
};


// Update plant quantity

const updateQuantity = async (req, res, next) => {
  try {
    const { quantityChange } = req.body;
    const plant = await plantService.updatePlantQuantity(
      req.params.id,
      quantityChange
    );
    res.status(200).json(plant);
  } catch (error) {
    next(error);
  }
};


//Mark plant out of stock

const markOutOfStock = async (req, res, next) => {
  try {
    const plant = await plantService.markOutOfStock(req.params.id);
    res.status(200).json(plant);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPlant,
  getPlants,
  updateQuantity,
  markOutOfStock
};
