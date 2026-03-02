const PlantType = require("../models/PlantType.model");
const PlantInventory = require("../models/PlantInventory.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");
const { removeUploadedFile } = require("../utils/uploadFile.util");
const { getCustomerPurchasedPlantTypeIds } = require("./accessScope.service");
const AuditLog = require("../models/AuditLog.model");

const PLANT_TYPE_POPULATION = {
  path: "updatedBy",
  select: "name email role"
};

const createPlantType = async (data, user) => {
  if (user.role !== "SUPER_ADMIN" && !user.nurseryId) {
    throw new ApiError(statusCode.BAD_REQUEST, "User is not assigned to a nursery");
  }

  const query = { name: data.name.trim(), deletedAt: { $exists: false } };
  if (user?.nurseryId) {
    query.nurseryId = user.nurseryId;
  }

  const exists = await PlantType.findOne(query);
  if (exists) {
    throw new ApiError(statusCode.CONFLICT, "PlantType already exists");
  }

  const plantType = await PlantType.create({
    ...data,
    nurseryId: user?.nurseryId || null
  });
  return PlantType.findById(plantType._id).populate(PLANT_TYPE_POPULATION);
};

const getPlantTypes = async (user) => {
  const query = { deletedAt: { $exists: false } };
  if (user?.role !== "SUPER_ADMIN" && user?.nurseryId) {
    query.nurseryId = user.nurseryId;
  }

  if (user?.role === "CUSTOMER") {
    const purchasedPlantTypeIds = await getCustomerPurchasedPlantTypeIds(user);
    query._id = { $in: purchasedPlantTypeIds };
  }

  return PlantType.find(query)
    .populate(PLANT_TYPE_POPULATION)
    .sort({ name: 1 });
};

const getPlantTypesById = async (id, user) => {
  const query = { _id: id };
  if (user?.role !== "SUPER_ADMIN" && user?.nurseryId) {
    query.nurseryId = user.nurseryId;
  }

  if (user?.role === "CUSTOMER") {
    const purchasedPlantTypeIds = await getCustomerPurchasedPlantTypeIds(user);
    query._id = { $in: purchasedPlantTypeIds };

    const isAccessible = purchasedPlantTypeIds.some(
      (plantTypeId) => plantTypeId.toString() === id.toString()
    );

    if (!isAccessible) {
      throw new ApiError(statusCode.NOT_FOUND, "Plant type not found");
    }

    query._id = id;
  }

  const plantType = await PlantType.findOne(query).populate(PLANT_TYPE_POPULATION);
  if (!plantType || plantType.deletedAt) {
    throw new ApiError(statusCode.NOT_FOUND, "Plant type not found");
  }
  return plantType;
};

const updatePlantType = async (id, data, user) => {
  if (data.name) {
    const exists = await PlantType.findOne({
      name: data.name.trim(),
      _id: { $ne: id },
      ...(user?.nurseryId ? { nurseryId: user.nurseryId } : {})
    });

    if (exists) {
      throw new ApiError(statusCode.CONFLICT, "PlantType already exists");
    }
  }

  const updatedPlantType = await PlantType.findOneAndUpdate(
    {
      _id: id,
      ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {})
    },
    {
      $set: {
        ...data,
        updatedBy: user.userId
      }
    },
    { new: true, runValidators: true }
  ).populate(PLANT_TYPE_POPULATION);

  if (!updatedPlantType) {
    throw new ApiError(statusCode.NOT_FOUND, "Plant type not found");
  }

  return updatedPlantType;
};

const attachPlantTypeImage = async (plantTypeId, file, user) => {
  const plantType = await PlantType.findOne({
    _id: plantTypeId,
    ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {})
  }).populate(PLANT_TYPE_POPULATION);

  if (!plantType) {
    throw new ApiError(statusCode.NOT_FOUND, "PlantType not found");
  }

  plantType.images.push({
    fileName: file.filename
  });

  await plantType.save();
  return PlantType.findById(plantType._id).populate(PLANT_TYPE_POPULATION);
};

const removePlantTypeImage = async (plantTypeId, imageId, user) => {
  const plantType = await PlantType.findOne({
    _id: plantTypeId,
    ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {})
  }).populate(PLANT_TYPE_POPULATION);

  if (!plantType) {
    throw new ApiError(statusCode.NOT_FOUND, "PlantType not found");
  }

  const image = plantType.images.id(imageId);
  if (!image) {
    throw new ApiError(statusCode.NOT_FOUND, "Image not found");
  }

  const { fileName } = image;
  image.deleteOne();
  await plantType.save();
  await removeUploadedFile(fileName);

  return PlantType.findById(plantType._id).populate(PLANT_TYPE_POPULATION);
};

const deletePlantType = async (id, user) => {
  const inventoryInUse = await PlantInventory.exists({
    plantType: id,
    ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {}),
    quantity: { $gt: 0 }
  });

  if (inventoryInUse) {
    throw new ApiError(
      statusCode.BAD_REQUEST,
      "Cannot delete plant type with active inventory"
    );
  }

  const plantType = await PlantType.findOneAndUpdate(
    {
      _id: id,
      ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {})
    },
    {
      deletedAt: new Date(),
      deletedBy: user.userId,
      active: false
    },
    { new: true }
  ).populate(PLANT_TYPE_POPULATION);
  if (!plantType) {
    throw new ApiError(statusCode.NOT_FOUND, "Plant type not found");
  }

  await AuditLog.create({
    nurseryId: plantType.nurseryId || user.nurseryId || null,
    actorUserId: user.userId,
    action: "SOFT_DELETED",
    entityType: "PlantType",
    entityId: plantType._id,
    before: {
      name: plantType.name,
      active: true
    },
    after: {
      deletedAt: plantType.deletedAt,
      active: plantType.active
    },
    occurredAt: new Date()
  });

  return plantType;
};

module.exports = {
  createPlantType,
  getPlantTypes,
  updatePlantType,
  attachPlantTypeImage,
  removePlantTypeImage,
  getPlantTypesById,
  deletePlantType
};
