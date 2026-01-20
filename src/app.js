const express = require("express");
const helmet = require("helmet");
const errorHandler = require("./middlewares/errorHandler.middleware");

const app = express();

app.use(helmet());
app.use(express.json());

// health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// routes go here
// app.use("/api/plants", plantRoutes);


app.use(errorHandler);

module.exports = app;
