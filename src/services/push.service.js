const PUSH_API_URL = "https://exp.host/--/api/v2/push/send";
const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_MAX_RETRIES = Number(process.env.EXPO_PUSH_MAX_RETRIES || 3);
const DEFAULT_BASE_RETRY_DELAY_MS = Number(
  process.env.EXPO_PUSH_RETRY_DELAY_MS || 700
);

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isValidExpoPushToken = (token) =>
  typeof token === "string" &&
  /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(token.trim());
const isLegacyExpoTokenPrefix = (token) =>
  typeof token === "string" && token.trim().startsWith("ExponentPushToken[");

const chunk = (items, size) => {
  if (!Array.isArray(items) || !items.length) return [];
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const isRetryableStatus = (status) => status >= 500 || status === 429;

const sendBatchOnce = async (batch) => {
  const res = await fetch(PUSH_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(batch)
  });

  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  return { res, body };
};

const sendBatchWithRetry = async (batch, maxRetries = DEFAULT_MAX_RETRIES) => {
  let attempt = 0;
  let lastError = null;

  while (attempt < maxRetries) {
    attempt += 1;
    try {
      const { res, body } = await sendBatchOnce(batch);
      if (!res.ok && isRetryableStatus(res.status) && attempt < maxRetries) {
        const delay = DEFAULT_BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        await sleep(delay);
        continue;
      }

      if (!res.ok) {
        return {
          ok: false,
          tickets: [],
          responseBody: body,
          retryExhausted: true,
          reason: `HTTP_${res.status}`
        };
      }

      const tickets = Array.isArray(body?.data) ? body.data : [];
      return {
        ok: true,
        tickets,
        responseBody: body,
        retryExhausted: false
      };
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = DEFAULT_BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        await sleep(delay);
        continue;
      }
    }
  }

  return {
    ok: false,
    tickets: [],
    responseBody: null,
    retryExhausted: true,
    reason: lastError?.message || "NETWORK_ERROR"
  };
};

const sendExpoPushNotifications = async (messages = []) => {
  if (!Array.isArray(messages) || !messages.length) {
    return {
      sent: 0,
      failed: 0,
      invalidTokens: []
    };
  }

  const validMessages = messages.filter(
    (msg) => isLegacyExpoTokenPrefix(msg?.to) && isValidExpoPushToken(msg?.to)
  );
  if (!validMessages.length) {
    return {
      sent: 0,
      failed: messages.length,
      invalidTokens: []
    };
  }

  let sent = 0;
  let failed = 0;
  const invalidTokens = new Set();
  const errors = [];

  for (const batch of chunk(validMessages, DEFAULT_BATCH_SIZE)) {
    console.log(
      "Sending push notification to:",
      batch.map((msg) => msg.to)
    );
    const result = await sendBatchWithRetry(batch);
    if (!result.ok) {
      failed += batch.length;
      errors.push({
        scope: "batch",
        reason: result.reason || "UNKNOWN_BATCH_ERROR",
        affected: batch.length
      });
      continue;
    }

    console.log("Expo response:", result.responseBody);

    for (let i = 0; i < batch.length; i += 1) {
      const ticket = result.tickets[i];
      const token = batch[i]?.to;
      const status = ticket?.status;
      if (status === "ok") {
        sent += 1;
        continue;
      }

      failed += 1;
      const errorCode = ticket?.details?.error;
      errors.push({
        token,
        status: status || "error",
        errorCode: errorCode || "UNKNOWN",
        message: ticket?.message || null
      });
      if (errorCode === "DeviceNotRegistered" && token) {
        invalidTokens.add(token);
      }
    }
  }

  return {
    sent,
    failed,
    invalidTokens: Array.from(invalidTokens),
    errors
  };
};

module.exports = {
  isValidExpoPushToken,
  sendExpoPushNotifications
};
