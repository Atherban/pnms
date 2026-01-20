const express = require("express");
const helmet = require("helmet");

const app = express();

// ---------- Global Middlewares ----------
app.use(helmet());
app.use(express.json());

// ---------- Health Check ----------
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// ---------- Routes ----------
// app.use("/api/plants", plantRoutes);

// ---------- Global Error Handler ----------
app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.statusCode || 500).json({
    message: err.message || "Internal Server Error"
  });
});

module.exports = app;
