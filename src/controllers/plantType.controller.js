const statusCode = require("../enums/statusCode");
const plantTypeService = require("../services/plantType.service");
const ApiError = require("../exceptions/ApiError");

const createPlantType = async (req, res, next) => {
  try {
    const plantType = await plantTypeService.createPlantType(req.body);

    res.status(statusCode.CREATED).json({
      message: "PlantType created successfully",
      data: plantType
    });
  } catch (err) {
    next(err);
  }
};

const getPlantTypes = async (req, res, next) => {
  try {
    const plantTypes = await plantTypeService.getPlantTypes();

    res.status(statusCode.OK).json({
      message: "PlantTypes retrieved successfully",
      data: plantTypes
    });
  } catch (err) {
    next(err);
  }
};

const getPlantTypesById = async(req,res,next)=>{
  try {
    
    const plantType = await plantTypeService.getPlantTypesById(
      req.params.id
    );

    res.status(statusCode.OK).json({
      message: "PlantTypes retrieved successfully",
      data: plantType
    })

  } catch (error) {
    next(error)
  }
}

const updatePlantType = async(req,res,next)=>{
  try {
    
     const plantType = await plantTypeService.updatePlantType(
      req.params.id,
      req.body,
      req.user
    );

    res.status(statusCode.OK).json({
      message: "PlantTypes updates successfully",
      data: plantType
    })

  } catch (error) {
    next(error)
  }
}

const uploadPlantTypeImage = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(statusCode.BAD_REQUEST, "Image file is required");
    }

    const plantType = await plantTypeService.attachPlantTypeImage(
      req.params.id,
      req.file
    );

    res.status(statusCode.OK).json({
      message: "PlantType image uploaded successfully",
      data: plantType
    });
  } catch (err) {
    next(err);
  }
};

const removePlantTypeImage = async (req, res, next) => {
  try {
    const plantType = await plantTypeService.removePlantTypeImage(
      req.params.id,
      req.params.imageId
    );

    res.status(statusCode.OK).json({
      message: "PlantType image removed successfully",
      data: plantType
    });
  } catch (err) {
    next(err);
  }
};

const deletePlantType = async (req, res, next) => {
  try {
    const plantType = await plantTypeService.deletePlantType(req.params.id);
    res.status(statusCode.OK).json({
      message: "PlantType deleted successfully",
      data: plantType
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createPlantType,
  getPlantTypes,
  getPlantTypesById,
  updatePlantType,
  uploadPlantTypeImage,
  removePlantTypeImage,
  deletePlantType
};
