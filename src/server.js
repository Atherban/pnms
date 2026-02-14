require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[server] -> running on http://0.0.0.0:${PORT}`);
  });
})().catch((err) => {
  console.error(`[server] -> failed to start: `, err);
  process.exit(1);
});
