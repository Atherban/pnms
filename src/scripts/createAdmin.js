const mongoose = require("mongoose");
const User = require("../models/User.model");
require("dotenv").config();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const admin = new User({
    name: "Test User",
    email: "test@example.com",
    password: "test_pass",
    role: "ADMIN"
  });

  await admin.save();
  console.log("Admin user created");

  process.exit();
})();
