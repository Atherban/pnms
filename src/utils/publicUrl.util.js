const normalizeBaseUrl = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\/+$/, "");
};

const getConfiguredBaseUrl = () => normalizeBaseUrl(process.env.BASE_URL);

const buildAbsoluteUrl = (path, req) => {
  if (!path) {
    return null;
  }

  const normalizedPath = String(path).startsWith("/")
    ? String(path)
    : `/${String(path)}`;

  const configuredBaseUrl = getConfiguredBaseUrl();
  if (configuredBaseUrl) {
    return `${configuredBaseUrl}${normalizedPath}`;
  }

  const host = req?.get?.("host");
  if (host) {
    return `${req.protocol}://${host}${normalizedPath}`;
  }

  return normalizedPath;
};

module.exports = {
  buildAbsoluteUrl,
  getConfiguredBaseUrl,
};
