const jwt = require("jsonwebtoken");
const ApiError = require("../exceptions/ApiError");

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Authentication required");
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, role }
    next();
  } catch (err) {
    throw new ApiError(401, "Invalid or expired token");
  }
};

module.exports = authenticate;
