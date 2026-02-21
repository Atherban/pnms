const UPLOADS_ROUTE_PREFIX = "/uploads";

const isPlainObject = (value) => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const toPlainValue = (value) => {
  if (value && typeof value.toObject === "function") {
    return value.toObject();
  }
  return value;
};

const buildImagePath = (fileName) => {
  if (!fileName) {
    return null;
  }

  const cleanedFileName = String(fileName).replace(/^\/+/, "");
  return `${UPLOADS_ROUTE_PREFIX}/${encodeURIComponent(cleanedFileName)}`;
};

const buildImageUrl = (req, path) => {
  if (!path) {
    return null;
  }

  const host = req?.get?.("host");
  if (!host) {
    return path;
  }

  return `${req.protocol}://${host}${path}`;
};

const mapImageMeta = (image, req) => {
  const imageValue = toPlainValue(image);
  if (!isPlainObject(imageValue)) {
    return imageValue;
  }

  const imagePath = buildImagePath(imageValue.fileName);
  return {
    ...imageValue,
    path: imagePath,
    url: buildImageUrl(req, imagePath)
  };
};

const enhanceResponseWithImages = (payload, req) => {
  const value = toPlainValue(payload);

  if (Array.isArray(value)) {
    return value.map((item) => enhanceResponseWithImages(item, req));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const output = {};
  for (const [key, childValue] of Object.entries(value)) {
    output[key] = enhanceResponseWithImages(childValue, req);
  }

  if (Array.isArray(value.images)) {
    output.images = value.images.map((image) => mapImageMeta(image, req));
    const latestImage = output.images[output.images.length - 1];
    if (latestImage?.path) {
      output.imagePath = latestImage.path;
      output.imageUrl = latestImage.url;
    }
  }

  return output;
};

module.exports = {
  enhanceResponseWithImages
};
