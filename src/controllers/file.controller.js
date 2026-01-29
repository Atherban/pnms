const fileService = require("../services/file.service");

const uploadPlantImage = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new Error("File missing");
    }

    const plant = await fileService.attachPlantImage(
      req.params.id,
      req.file
    );

    res.status(200).json({
      message: "Image uploaded successfully",
      data: plant
    });
  } catch (err) {
    next(err);
  }
};


module.exports = {
  uploadPlantImage
};
