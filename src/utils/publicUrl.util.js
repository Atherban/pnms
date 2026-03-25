const normalizeBaseUrl = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\/+$/, "");
};

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";
// console.log(BASE_URL);


const getConfiguredBaseUrl = () => normalizeBaseUrl(BASE_URL);

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
  BASE_URL
};
