const statusCode = require("../enums/statusCode");
const { buildCustomerProductFeed } = require("../services/productFeed.service");

const getCustomerProductFeed = async (req, res, next) => {
  try {
    const feed = await buildCustomerProductFeed(req.user);

    res.status(statusCode.OK).json({
      message: "Product feed retrieved successfully",
      data: feed
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCustomerProductFeed
};
