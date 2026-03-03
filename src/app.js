const express = require("express");
const helmet = require("helmet");
const errorHandler = require("./middlewares/errorHandler.middleware");
const responseImageMiddleware = require("./middlewares/responseImage.middleware");
const {
  createRateLimiter,
  rejectUnsafePayload
} = require("./middlewares/security.middleware");

const seedRoutes = require("./routes/seed.routes");
const sowingRoutes = require("./routes/sowing.routes");
const germinationRoutes = require("./routes/germination.routes");
const saleRoutes = require("./routes/sale.routes");
const profitRoutes = require("./routes/profit.routes");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const plantTypeRoutes = require("./routes/plantType.routes");
const inventoryRoutes = require("./routes/inventory.routes");
const customerRoutes = require("./routes/customer.routes");
const customerSeedBatchRoutes = require("./routes/customerSeedBatch.routes");
const expenseRoutes = require("./routes/expense.routes");
const labourRoutes = require("./routes/labour.routes");
const paymentRoutes = require("./routes/payment.routes");
const nurseryRoutes = require("./routes/nursery.routes");
const bannerRoutes = require("./routes/banner.routes");
const reportRoutes = require("./routes/report.routes");
const staffAccountRoutes = require("./routes/staffAccount.routes");
const notificationRoutes = require("./routes/notification.routes");
const auditLogRoutes = require("./routes/auditLog.routes");
const maintenanceRoutes = require("./routes/maintenance.routes");


const app = express();

app.use(helmet());
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(createRateLimiter());
app.use(rejectUnsafePayload);
app.use(responseImageMiddleware);
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (
      body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      !Object.prototype.hasOwnProperty.call(body, "success")
    ) {
      return originalJson({
        success: res.statusCode < 400,
        ...body
      });
    }
    return originalJson(body);
  };
  next();
});

// health check
app.get("/health", (req, res) => {
  res.status(200).json({ success: true, status: "OK" });
});


// API routes
app.use("/api/profit", profitRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/seeds", seedRoutes);
app.use("/api/sowing", sowingRoutes);
app.use("/api/germination", germinationRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/plant-types", plantTypeRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/customer-seed-batches", customerSeedBatchRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/labours", labourRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/nurseries", nurseryRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/staff-accounts", staffAccountRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/maintenance", maintenanceRoutes);


// serve uploaded files
if (!process.env.UPLOADS_BASE_PATH) {
  throw new Error("UPLOADS_BASE_PATH is not defined in environment variables");
}

app.use("/uploads", express.static(process.env.UPLOADS_BASE_PATH));

// global error handler (must be last)
app.use(errorHandler);

module.exports = app;
