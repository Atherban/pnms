const DEFAULT_TTL_SECONDS = Number(process.env.API_CACHE_TTL_SECONDS || 45);

const cacheStore = new Map();

const buildCacheKey = (parts = []) =>
  parts
    .map((part) => (part === undefined || part === null ? "" : String(part)))
    .join("::");

const getCachedValue = (key) => {
  const entry = cacheStore.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key);
    return null;
  }

  return entry.value;
};

const setCachedValue = (key, value, ttlSeconds = DEFAULT_TTL_SECONDS) => {
  const safeTtl = Math.max(1, Number(ttlSeconds) || DEFAULT_TTL_SECONDS);
  cacheStore.set(key, {
    value,
    expiresAt: Date.now() + safeTtl * 1000
  });
};

const invalidateCache = (prefix) => {
  if (!prefix) return;
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) cacheStore.delete(key);
  }
};

const invalidateAll = () => {
  cacheStore.clear();
};

module.exports = {
  buildCacheKey,
  getCachedValue,
  setCachedValue,
  invalidateCache,
  invalidateAll
};
