const Seed = require("../models/Seed.model");
const PlantType = require("../models/PlantType.model");
const ApiError = require("../exceptions/ApiError");
const { removeUploadedFile } = require("../utils/uploadFile.util");
const { getCustomerPurchasedPlantTypeIds } = require("./accessScope.service");
const AuditLog = require("../models/AuditLog.model");

const SEED_POPULATION = [
  {
    path: "plantType",
    select: "name category variety sellingPrice images expectedSeedQtyPerBatch expectedSeedUnit"
  },
  { path: "createdBy", select: "name email role" },
  { path: "updatedBy", select: "name email role" }
];

const QUANTITY_UNITS = ["SEEDS", "GRAM", "KG", "UNITS"];

const normalizeQuantityUnit = (value, fallback = "SEEDS") => {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toUpperCase();
  return QUANTITY_UNITS.includes(normalized) ? normalized : fallback;
};

// Create seed (ADMIN)
const createSeed = async (data, user) => {
  if (user.role !== "SUPER_ADMIN" && !user.nurseryId) {
    throw new ApiError(400, "User is not assigned to a nursery");
  }

  const plantType = await PlantType.findOne({
    _id: data.plantType,
    ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {})
  });

  if (!plantType) {
    throw new ApiError(400, "Invalid plant type");
  }

  const resolvedQuantityUnit = normalizeQuantityUnit(
    data?.quantityUnit,
    normalizeQuantityUnit(plantType?.expectedSeedUnit, "SEEDS")
  );

  const seed = await Seed.create({
    ...data,
    quantityUnit: resolvedQuantityUnit,
    nurseryId: user.nurseryId || null,
    createdBy: user.userId
  });

  return Seed.findById(seed._id).populate(SEED_POPULATION);
};

// Get all seeds
const getAllSeeds = async (user) => {
  const query = {
    isDeleted: false,
    ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {})
  };

  if (user?.role === "CUSTOMER") {
    const purchasedPlantTypeIds = await getCustomerPurchasedPlantTypeIds(user);
    query.plantType = { $in: purchasedPlantTypeIds };
  }

  return Seed.find(query)
    .populate(SEED_POPULATION);
};

// Get seed by ID
const getSeedById = async (seedId, user) => {
  const query = {
    _id: seedId,
    isDeleted: false,
    ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {})
  };

  if (user?.role === "CUSTOMER") {
    const purchasedPlantTypeIds = await getCustomerPurchasedPlantTypeIds(user);
    query.plantType = { $in: purchasedPlantTypeIds };
  }

  const seed = await Seed.findOne(query).populate(SEED_POPULATION);

  if (!seed) {
    throw new ApiError(404, "Seed not found");
  }

  return seed;
};

// Update seed (SAFE FIELDS ONLY)
const updateSeedById = async (seedId, data, user) => {
  const normalizedData = {
    ...data
  };

  if (data?.quantityUnit) {
    normalizedData.quantityUnit = normalizeQuantityUnit(data.quantityUnit);
  }

  const seed = await Seed.findOneAndUpdate(
    {
      _id: seedId,
      isDeleted: false,
      ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {})
    },
    {
      ...normalizedData,
      updatedBy: user.userId
    },
    { new: true, runValidators: true }
  ).populate(SEED_POPULATION);

  if (!seed) {
    throw new ApiError(404, "Seed not found");
  }

  return seed;
};

// Soft delete seed
const deleteSeedById = async (seedId, user) => {
  const seed = await Seed.findOneAndUpdate(
    {
      _id: seedId,
      isDeleted: false,
      ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {})
    },
    { isDeleted: true, deletedAt: new Date(), deletedBy: user.userId },
    { new: true }
  ).populate(SEED_POPULATION);

  if (!seed) {
    throw new ApiError(404, "Seed not found");
  }

  await AuditLog.create({
    nurseryId: seed.nurseryId || user.nurseryId || null,
    actorUserId: user.userId,
    action: "SOFT_DELETED",
    entityType: "Seed",
    entityId: seed._id,
    before: {
      name: seed.name,
      isDeleted: false
    },
    after: {
      isDeleted: true,
      deletedAt: seed.deletedAt
    },
    occurredAt: new Date()
  });

  return seed;
};

const attachSeedImage = async (seedId, file, user) => {
  const seed = await Seed.findOne({
    _id: seedId,
    isDeleted: false,
    ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {})
  }).populate(SEED_POPULATION);

  if (!seed) {
    throw new ApiError(404, "Seed not found");
  }

  seed.images.push({
    fileName: file.filename
  });

  await seed.save();
  return Seed.findById(seed._id).populate(SEED_POPULATION);
};

const removeSeedImage = async (seedId, imageId, user) => {
  const seed = await Seed.findOne({
    _id: seedId,
    isDeleted: false,
    ...(user?.role !== "SUPER_ADMIN" && user?.nurseryId ? { nurseryId: user.nurseryId } : {})
  }).populate(SEED_POPULATION);

  if (!seed) {
    throw new ApiError(404, "Seed not found");
  }

  const image = seed.images.id(imageId);
  if (!image) {
    throw new ApiError(404, "Image not found");
  }

  const { fileName } = image;
  image.deleteOne();
  await seed.save();
  await removeUploadedFile(fileName);

  return Seed.findById(seed._id).populate(SEED_POPULATION);
};

const useSeeds = async (seedId, quantity) => {
  const seed = await Seed.findOne({
    _id: seedId,
    isDeleted: false
  }).populate(SEED_POPULATION);

  if (!seed) {
    throw new ApiError(404, "Seed not found");
  }

  if (seed.expiryDate < new Date()) {
    throw new ApiError(400, "Seed batch has expired");
  }

  const available = seed.totalPurchased - seed.seedsUsed;

  if (quantity > available) {
    throw new ApiError(400, "Insufficient seed stock");
  }

  seed.seedsUsed += quantity;
  await seed.save();

  return Seed.findById(seed._id).populate(SEED_POPULATION);
};

module.exports = {
  createSeed,
  getAllSeeds,
  getSeedById,
  updateSeedById,
  deleteSeedById,
  attachSeedImage,
  removeSeedImage,
  useSeeds
};
