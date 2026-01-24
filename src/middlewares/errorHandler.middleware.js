const errorHandler = (err, req, res, next) => {
  const isOperational = err.isOperational === true;

  const statusCode = isOperational ? err.statusCode : 500;

  const message = isOperational
    ? err.message
    : "Something went wrong. Please try again later.";

  if (!isOperational) {
    console.error({
      message: err.message,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method
    });
  }

  res.status(statusCode).json({
    success: false,
    message
  });
};

module.exports = errorHandler;
