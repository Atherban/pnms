const jwt = require("jsonwebtoken");
const ApiError = require("../exceptions/ApiError");
const { normalizeRole } = require("../utils/role.util");
const User = require("../models/User.model");
const Nursery = require("../models/Nursery.model");

const authenticate = async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      return next(new ApiError(500, "JWT secret is not configured"));
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new ApiError(401, "Authentication required"));
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"]
    });

    const user = await User.findById(decoded.userId).select("_id role nurseryId isActive deletedAt");
    if (!user || user.deletedAt) {
      return next(new ApiError(401, "Invalid or expired token"));
    }
    if (!user.isActive) {
      return next(new ApiError(403, "User account is disabled"));
    }

    if (user.role !== "SUPER_ADMIN" && user.nurseryId) {
      const nursery = await Nursery.findOne({
        _id: user.nurseryId,
        deletedAt: { $exists: false }
      }).select("_id status");

      if (!nursery || nursery.status !== "ACTIVE") {
        return next(new ApiError(403, "Nursery is suspended or deleted"));
      }
    }

    req.user = {
      ...decoded,
      userId: String(user._id),
      role: normalizeRole(user.role),
      nurseryId: user.nurseryId || null
    }; // { userId, role, nurseryId, tokenVersion }
    next();
  } catch (err) {
    next(new ApiError(401, "Invalid or expired token"));
  }
};

module.exports = authenticate;
