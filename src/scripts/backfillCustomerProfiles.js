const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/User.model");
const { ensureCustomerProfileForUser } = require("../services/customer.service");

(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI not set");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const users = await User.find({
    role: "CUSTOMER",
    deletedAt: { $exists: false }
  }).select("_id role nurseryId name phoneNumber isActive");

  let processed = 0;
  let skippedNoPhone = 0;
  let failures = 0;

  for (const user of users) {
    if (!user.phoneNumber) {
      skippedNoPhone += 1;
      continue;
    }

    try {
      await ensureCustomerProfileForUser(user);
      processed += 1;
    } catch (error) {
      failures += 1;
      // Keep processing remaining users.
      console.error(`Failed for user ${user._id}: ${error.message}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        totalCustomerUsers: users.length,
        processed,
        skippedNoPhone,
        failures
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
})().catch(async (err) => {
  console.error("Backfill failed:", err);
  try {
    await mongoose.disconnect();
  } catch (e) {
    // noop
  }
  process.exit(1);
});
