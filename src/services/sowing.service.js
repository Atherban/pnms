const SeedSowing = require("../models/SeedSowing.model");
const seedService = require("./seed.service");

const sowSeeds = async (data) => {
  // reduce seed stock first (business invariant)
  await seedService.useSeeds(data.seedId, data.totalSeedsSown);

  return SeedSowing.create({
    seed: data.seedId,
    totalSeedsSown: data.totalSeedsSown,
    sowingDate: data.sowingDate
  });
};

module.exports = {
  sowSeeds
};
