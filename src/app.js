const express = require("express");
const helmet = require("helmet");
const errorHandler = require("./middlewares/errorHandler.middleware");
const plantRoutes = require("./routes/plant.routes");
const seedRoutes = require("./routes/seed.routes");
const sowingRoutes = require("./routes/sowing.routes");
const germinationRoutes = require("./routes/germination.routes");
const saleRoutes = require("./routes/sale.routes");
const profitRoutes = require("./routes/profit.routes");

const app = express();

app.use(helmet());
app.use(express.json());

// health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});


app.use("/api/profit", profitRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/plants", plantRoutes);
app.use("/api/seeds", seedRoutes);
app.use("/api/sowing", sowingRoutes);
app.use("/api/germination", germinationRoutes);

app.use(errorHandler);

module.exports = app;
