const Customer = require("../models/Customer.model");
const Sale = require("../models/Sale.model");
const PlantInventory = require("../models/PlantInventory.model");

const getCustomerProfile = async (user) => {
  if (!user || user.role !== "CUSTOMER") {
    return null;
  }

  return Customer.findOne({
    userId: user.userId,
    ...(user?.nurseryId ? { nurseryId: user.nurseryId } : {}),
    deletedAt: { $exists: false }
  }).select("_id nurseryId");
};

const getCustomerPurchasedInventoryIds = async (user) => {
  const customerProfile = await getCustomerProfile(user);
  if (!customerProfile) {
    return [];
  }

  return Sale.distinct("items.inventory", {
    customer: customerProfile._id,
    isVoided: { $ne: true },
    ...(customerProfile?.nurseryId ? { nurseryId: customerProfile.nurseryId } : {})
  });
};

const getCustomerPurchasedPlantTypeIds = async (user) => {
  const inventoryIds = await getCustomerPurchasedInventoryIds(user);
  if (!inventoryIds.length) {
    return [];
  }

  return PlantInventory.distinct("plantType", {
    _id: { $in: inventoryIds }
  });
};

module.exports = {
  getCustomerProfile,
  getCustomerPurchasedInventoryIds,
  getCustomerPurchasedPlantTypeIds
};
