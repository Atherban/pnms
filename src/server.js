require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const { startSoftDeleteRetentionJob } = require("./services/softDeleteRetention.service");
const { startDueReminderJob } = require("./services/notification.service");
const { ensurePushTokenFieldsForAllUsers } = require("./services/user.service");

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  const backfillResult = await ensurePushTokenFieldsForAllUsers();
  if (backfillResult.modifiedCount > 0) {
    console.log(
      `[push-token-backfill] updated ${backfillResult.modifiedCount} legacy user document(s)`
    );
  }
  startSoftDeleteRetentionJob();
  startDueReminderJob();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[server] -> running on http://0.0.0.0:${PORT}`);
  });
})().catch((err) => {
  console.error(`[server] -> failed to start: `, err);
  process.exit(1);
});
