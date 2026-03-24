const PlantInventory = require("../models/PlantInventory.model");
const Seed = require("../models/Seed.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");
const { getCustomerProfile } = require("./accessScope.service");

const normalizeCategory = (value) => String(value || "").trim().toUpperCase();

const formatSectionTitle = (value) => {
  const key = normalizeCategory(value);
  if (!key) return "Products";
  if (key === "VEGETABLE") return "Vegetables";
  if (key === "FLOWER") return "Flowers";
  if (key === "FRUIT") return "Fruits";
  if (key === "HERB") return "Herbs";
  return key.charAt(0) + key.slice(1).toLowerCase();
};

const buildMarketplaceProducts = async ({ nurseryId }) => {
  const inventory = await PlantInventory.find({
    nurseryId,
    quantity: { $gte: 0 }
  })
    .populate([
      {
        path: "plantType",
        select:
          "name category variety sellingPrice images expectedSeedQtyPerBatch expectedSeedUnit active deletedAt"
      }
    ])
    .sort({ createdAt: -1 });

  const byPlantType = new Map();

  for (const row of Array.isArray(inventory) ? inventory : []) {
    const plantType = row.plantType;
    if (!plantType || typeof plantType !== "object") continue;
    if (plantType.deletedAt) continue;
    if (plantType.active === false) continue;

    const plantTypeId = String(plantType._id);
    const qty = Math.max(0, Number(row.quantity || 0));
    const status = String(row.status || "AVAILABLE");
    const growthStage = String(row.growthStage || "GERMINATED");
    const isInStock = status === "AVAILABLE" && qty > 0;

    if (!byPlantType.has(plantTypeId)) {
      byPlantType.set(plantTypeId, {
        plantTypeId,
        name: plantType.name,
        category: plantType.category,
        variety: plantType.variety,
        sellingPrice: plantType.sellingPrice,
        images: plantType.images || [],
        expectedSeedQtyPerBatch: plantType.expectedSeedQtyPerBatch,
        expectedSeedUnit: plantType.expectedSeedUnit,
        availableQuantity: 0,
        totalQuantity: 0,
        quantityUnit: row.quantityUnit || "UNITS",
        inventoryItemIds: [],
        growthStageCounts: {
          GERMINATED: 0,
          READY_FOR_SALE: 0,
          SOLD_OUT: 0
        },
        statusCounts: {
          AVAILABLE: 0,
          OUT_OF_STOCK: 0
        },
        inventoryItems: []
      });
    }

    const product = byPlantType.get(plantTypeId);
    product.totalQuantity += qty;
    if (isInStock) {
      product.availableQuantity += qty;
    }
    product.inventoryItemIds.push(String(row._id));
    if (product.growthStageCounts?.[growthStage] !== undefined) {
      product.growthStageCounts[growthStage] += qty;
    }
    if (product.statusCounts?.[status] !== undefined) {
      product.statusCounts[status] += qty;
    }
    product.inventoryItems.push({
      id: String(row._id),
      quantity: qty,
      quantityUnit: row.quantityUnit || "UNITS",
      status,
      growthStage,
      receivedAt: row.receivedAt,
      createdAt: row.createdAt
    });
  }

  return Array.from(byPlantType.values()).sort((a, b) => {
    const catA = String(a.category || "");
    const catB = String(b.category || "");
    if (catA !== catB) return catA.localeCompare(catB);
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
};

const resolveCustomerNurseryId = async (user) => {
  const customerProfile = await getCustomerProfile(user);
  return user.nurseryId || customerProfile?.nurseryId;
};

const listCustomerMarketplaceProducts = async (user) => {
  if (user.role !== "CUSTOMER") {
    throw new ApiError(statusCode.FORBIDDEN, "Only customers can access marketplace products");
  }

  const nurseryId = await resolveCustomerNurseryId(user);
  if (!nurseryId) {
    throw new ApiError(statusCode.BAD_REQUEST, "Nursery is required for marketplace products");
  }

  return buildMarketplaceProducts({ nurseryId });
};

const buildPlantFeedItems = async (user) => {
  const products = await listCustomerMarketplaceProducts(user);
  return products.map((product) => {
    const available = Number(product.availableQuantity || 0);
    const total = Number(product.totalQuantity || available);
    const unit = product.quantityUnit || "UNITS";

    return {
      id: `plant:${product.plantTypeId}`,
      sourceId: product.plantTypeId,
      type: "PLANT",
      name: product.name,
      category: product.category,
      price: product.sellingPrice ?? null,
      image: product.images?.[0]?.fileName ?? null,
      images: product.images || [],
      availability: {
        available,
        total,
        unit,
        inStock: available > 0
      },
      meta: {
        variety: product.variety,
        inventoryItemIds: product.inventoryItemIds,
        growthStageCounts: product.growthStageCounts,
        statusCounts: product.statusCounts
      }
    };
  });
};

const buildSeedFeedItems = async (nurseryId) => {
  const seeds = await Seed.find({
    nurseryId,
    isDeleted: { $ne: true }
  })
    .populate({
      path: "plantType",
      select: "name category variety sellingPrice images expectedSeedUnit active deletedAt"
    })
    .sort({ createdAt: -1 });

  const items = [];
  for (const seed of Array.isArray(seeds) ? seeds : []) {
    const plantType = seed.plantType;
    if (!plantType || typeof plantType !== "object") continue;
    if (plantType.deletedAt) continue;
    if (plantType.active === false) continue;

    const total = Math.max(0, Number(seed.totalPurchased || 0));
    const used = Math.max(0, Number(seed.seedsUsed || 0));
    const available = Math.max(0, total - used);

    items.push({
      id: `seed:${seed._id}`,
      sourceId: String(seed._id),
      type: "SEED",
      name: seed.name,
      category: plantType.category,
      price: plantType.sellingPrice ?? null,
      image:
        seed.images?.[0]?.fileName ??
        plantType.images?.[0]?.fileName ??
        null,
      images: seed.images?.length ? seed.images : plantType.images || [],
      availability: {
        available,
        total,
        unit: seed.quantityUnit || "SEEDS",
        inStock: available > 0
      },
      meta: {
        plantTypeId: plantType._id,
        plantTypeName: plantType.name,
        supplierName: seed.supplierName,
        expiryDate: seed.expiryDate
      }
    });
  }

  return items;
};

const buildFeedSections = (plantItems, seedItems) => {
  const sections = [];

  const plantGroups = new Map();
  for (const item of plantItems) {
    const key = normalizeCategory(item.category) || "OTHER";
    if (!plantGroups.has(key)) plantGroups.set(key, []);
    plantGroups.get(key).push(item);
  }

  for (const [categoryKey, items] of plantGroups.entries()) {
    sections.push({
      id: `plants-${categoryKey}`,
      type: "PLANT",
      category: categoryKey,
      title: formatSectionTitle(categoryKey),
      subtitle: `${items.length} item${items.length === 1 ? "" : "s"}`,
      items
    });
  }

  const seedGroups = new Map();
  for (const item of seedItems) {
    const key = normalizeCategory(item.category) || "OTHER";
    if (!seedGroups.has(key)) seedGroups.set(key, []);
    seedGroups.get(key).push(item);
  }

  for (const [categoryKey, items] of seedGroups.entries()) {
    sections.push({
      id: `seeds-${categoryKey}`,
      type: "SEED",
      category: categoryKey,
      title: `Seeds · ${formatSectionTitle(categoryKey)}`,
      subtitle: `${items.length} item${items.length === 1 ? "" : "s"}`,
      items
    });
  }

  return sections.sort((a, b) => a.title.localeCompare(b.title));
};

const buildCustomerProductFeed = async (user) => {
  if (user.role !== "CUSTOMER") {
    throw new ApiError(statusCode.FORBIDDEN, "Only customers can access product feed");
  }

  const nurseryId = await resolveCustomerNurseryId(user);
  if (!nurseryId) {
    throw new ApiError(statusCode.BAD_REQUEST, "Nursery is required for product feed");
  }

  const [plantItems, seedItems] = await Promise.all([
    buildPlantFeedItems(user),
    buildSeedFeedItems(nurseryId)
  ]);

  const items = [...plantItems, ...seedItems];
  const sections = buildFeedSections(plantItems, seedItems);

  return {
    items,
    sections,
    updatedAt: new Date().toISOString()
  };
};

module.exports = {
  listCustomerMarketplaceProducts,
  buildCustomerProductFeed
};
