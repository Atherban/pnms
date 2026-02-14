const statusCode = require("../enums/statusCode");

const errorHandler = (err, req, res, next) => {
  let httpStatus = statusCode.INTERNAL_SERVER_ERROR;
  let message = "Something went wrong. Please try again later.";
  const details = [];

  if (err.isOperational === true) {
    httpStatus = err.statusCode;
    message = err.message;
  } else if (err.name === "ValidationError") {
    httpStatus = statusCode.BAD_REQUEST;
    message = "Validation failed";
    details.push(...Object.values(err.errors).map((e) => e.message));
  } else if (err.name === "CastError") {
    httpStatus = statusCode.BAD_REQUEST;
    message = `Invalid ${err.path}`;
  } else if (err.code === 11000) {
    httpStatus = statusCode.CONFLICT;
    message = "Duplicate value detected";
  } else if (err.name === "MulterError") {
    httpStatus = statusCode.BAD_REQUEST;
    message = err.message;
  }

  if (httpStatus === statusCode.INTERNAL_SERVER_ERROR) {
    console.error({
      message: err.message,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method
    });
  }

  res.status(httpStatus).json({
    success: false,
    message,
    ...(details.length ? { details } : {})
  });
};

module.exports = errorHandler;
