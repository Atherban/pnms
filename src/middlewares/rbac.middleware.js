const ApiError = require("../exceptions/ApiError");
const { expandAllowedRoles, normalizeRole } = require("../utils/role.util");

const authorize = (...allowedRoles) => {
  const normalizedAllowedRoles = expandAllowedRoles(allowedRoles).map(normalizeRole);

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(new ApiError(401, "Authentication required"));
    }

    const normalizedUserRole = normalizeRole(req.user.role);
    if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
      return next(new ApiError(403, "Access denied"));
    }

    req.user.role = normalizedUserRole;
    next();
  };
};

module.exports = authorize;
