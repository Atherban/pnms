const {
  buildCacheKey,
  getCachedValue,
  setCachedValue
} = require("../utils/cache.util");

const cacheGetResponse = ({ ttlSeconds = 45, keyPrefix = "api-cache" } = {}) => (
  req,
  res,
  next
) => {
  if (req.method !== "GET") return next();

  const user = req.user || {};
  const cacheKey = buildCacheKey([
    keyPrefix,
    req.baseUrl,
    req.path,
    JSON.stringify(req.query || {}),
    user.userId || "anonymous",
    user.role || "anonymous",
    user.nurseryId || "none"
  ]);

  const cached = getCachedValue(cacheKey);
  if (cached) {
    return res.status(200).json(cached);
  }

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      setCachedValue(cacheKey, body, ttlSeconds);
    }
    return originalJson(body);
  };

  return next();
};

module.exports = {
  cacheGetResponse
};
