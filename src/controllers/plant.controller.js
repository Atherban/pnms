const statusCode = require("../enums/statusCode");
const plantService = require("../services/plant.service");


// Create plant
const createPlant = async (req, res, next) => {
  try {
    const plant = await plantService.createPlant(req.body);
    res.status(statusCode.CREATED).json(plant);
  } catch (error) {
    next(error);
  }
};

// Get all plants
const getPlants = async (req, res, next) => {
  try {
    const plants = await plantService.getAllPlants();
    res.status(statusCode.OK).json(plants);
  } catch (error) {
    next(error);
  }
};

// Get plant by ID
const getPlantById = async (req, res, next) => {
  try {
    const plant = await plantService.getPlantById(req.params.id);
    res.status(statusCode.OK).json(plant);
  } catch (error) {
    next(error);
  }
};

// Delete plant by ID
const deletePlantById = async(req,res,next)=>{
  try {
    const plant = await plantService.deletePlantById(req.params.id);
    res.status(statusCode.OK).json(plant);
  } catch (error) {
    next(error);
  }
}

// Update plant Details
const updatePlantDetails = async(req,res,next)=>{
  try {
    const plant = await plantService.updatePlantDetails(req.params.id, req.body);
    res.status(statusCode.OK).json(plant);
  } catch (error) {
    next(error);
  }
}

// Update plant quantity
const updateQuantity = async (req, res, next) => {
  try {
    const { quantityChange } = req.body;
    const plant = await plantService.updatePlantQuantity(
      req.params.id,
      quantityChange
    );
    res.status(statusCode.OK).json(plant);
  } catch (error) {
    next(error);
  }
};


//Mark plant out of stock

const markOutOfStock = async (req, res, next) => {
  try {
    const plant = await plantService.markOutOfStock(req.params.id);
    res.status(statusCode.OK).json(plant);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPlant,
  getPlants,
  getPlantById,
  deletePlantById,
  updatePlantDetails,
  updateQuantity,
  markOutOfStock
};
