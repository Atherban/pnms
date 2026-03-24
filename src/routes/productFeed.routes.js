const express = require("express");
const router = express.Router();

const productFeedController = require("../controllers/productFeed.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");

router.get(
  "/",
  authenticate,
  authorize("CUSTOMER"),
  productFeedController.getCustomerProductFeed
);

module.exports = router;
