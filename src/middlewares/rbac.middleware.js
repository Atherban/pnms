const ApiError = require("../exceptions/ApiError");

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(new ApiError(401, "Authentication required"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, "Access denied"));
    }

    next();
  };
};

module.exports = authorize;
