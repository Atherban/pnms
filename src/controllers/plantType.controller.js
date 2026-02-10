const statusCode = require("../enums/statusCode");
const plantTypeService = require("../services/plantType.service");

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

const uploadPlantTypeImage = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new Error("Image file is required");
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

module.exports = {
  createPlantType,
  getPlantTypes,
  getPlantTypesById,
  uploadPlantTypeImage
};
