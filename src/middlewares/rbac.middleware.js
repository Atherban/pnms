const ApiError = require("../exceptions/ApiError");

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, "Access denied");
    }
    next();
  };
};

module.exports = authorize;
