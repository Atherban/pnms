const createRateLimiter = ({
  windowMs = 60 * 1000,
  maxRequests = 120,
  message = "Too many requests. Please try again shortly."
} = {}) => {
  const buckets = new Map();

  return (req, res, next) => {
    const ip =
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.connection?.remoteAddress ||
      "unknown";
    const now = Date.now();
    const bucket = buckets.get(ip) || { count: 0, expiresAt: now + windowMs };

    if (now > bucket.expiresAt) {
      bucket.count = 0;
      bucket.expiresAt = now + windowMs;
    }

    bucket.count += 1;
    buckets.set(ip, bucket);

    if (bucket.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message
      });
    }

    return next();
  };
};

const hasUnsafeOperator = (value) => {
  if (!value || typeof value !== "object") return false;

  if (Array.isArray(value)) {
    return value.some((item) => hasUnsafeOperator(item));
  }

  return Object.entries(value).some(([key, nested]) => {
    if (typeof key === "string" && (key.startsWith("$") || key.includes("."))) {
      return true;
    }
    return hasUnsafeOperator(nested);
  });
};

const rejectUnsafePayload = (req, res, next) => {
  if (
    hasUnsafeOperator(req.body) ||
    hasUnsafeOperator(req.query) ||
    hasUnsafeOperator(req.params)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid request payload"
    });
  }

  return next();
};

module.exports = {
  createRateLimiter,
  rejectUnsafePayload
};
