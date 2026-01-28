const mongoose = require("mongoose");
const User = require("../models/User.model");
require("dotenv").config();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const admin = new User({
    name: "Admin User",
    email: "admin@example.com",
    password: "password123",
    role: "ADMIN"
  });

  await admin.save();
  console.log("Admin user created");

  process.exit();
})();
