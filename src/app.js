const express = require("express");
const helmet = require("helmet");
const errorHandler = require("./middlewares/errorHandler.middleware");

const plantRoutes = require("./routes/plant.routes");
const seedRoutes = require("./routes/seed.routes");
const sowingRoutes = require("./routes/sowing.routes");
const germinationRoutes = require("./routes/germination.routes");
const saleRoutes = require("./routes/sale.routes");
const profitRoutes = require("./routes/profit.routes");
const uploadRoutes = require("./routes/upload.routes");

const app = express();

app.use(helmet());
app.use(express.json());

// health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// API routes
app.use("/api/profit", profitRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/plants", plantRoutes);
app.use("/api/seeds", seedRoutes);
app.use("/api/sowing", sowingRoutes);
app.use("/api/germination", germinationRoutes);
app.use("/api/uploads", uploadRoutes);

// serve uploaded files
if (!process.env.UPLOADS_BASE_PATH) {
  throw new Error("UPLOADS_BASE_PATH is not defined in environment variables");
}

app.use("/uploads", express.static(process.env.UPLOADS_BASE_PATH));

// global error handler (must be last)
app.use(errorHandler);

module.exports = app;
