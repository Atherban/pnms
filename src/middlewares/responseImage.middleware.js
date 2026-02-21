const { enhanceResponseWithImages } = require("../utils/imageResponse.util");

const responseImageMiddleware = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (payload) => {
    if (
      payload &&
      typeof payload === "object" &&
      Object.prototype.hasOwnProperty.call(payload, "data")
    ) {
      return originalJson({
        ...payload,
        data: enhanceResponseWithImages(payload.data, req)
      });
    }

    return originalJson(payload);
  };

  next();
};

module.exports = responseImageMiddleware;
