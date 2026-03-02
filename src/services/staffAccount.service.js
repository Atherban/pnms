const StaffAccount = require("../models/StaffAccount.model");

const startOfMonth = (date = new Date()) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
const endOfMonth = (date = new Date()) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));

const upsertStaffAccount = async ({
  nurseryId,
  staffUserId,
  staffRole,
  salesDelta = 0,
  collectedDelta = 0,
  expensesDelta = 0
}, session) => {
  if (staffRole && staffRole !== "STAFF") {
    return null;
  }

  if (!staffUserId) {
    return null;
  }

  const now = new Date();
  const periodStart = startOfMonth(now);
  const periodEnd = endOfMonth(now);

  const account = await StaffAccount.findOneAndUpdate(
    {
      nurseryId: nurseryId || null,
      staffUserId,
      periodStart,
      periodEnd
    },
    {
      $inc: {
        totalSalesAmount: salesDelta,
        totalCollectedAmount: collectedDelta,
        totalExpensesRecorded: expensesDelta,
        netAccountableBalance: collectedDelta - expensesDelta
      }
    },
    { upsert: true, new: true, session, setDefaultsOnInsert: true }
  );

  return account;
};

module.exports = {
  upsertStaffAccount
};
