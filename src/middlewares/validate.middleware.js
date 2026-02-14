const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");

const validate = (schema, property = "body") => {
  return async (req, res, next) => {
    try {
      req[property] = await schema.validateAsync(req[property], {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
        errors: { wrap: { label: "" } },
      });

      next();
    } catch (err) {
      // Joi validation error
      if (err.isJoi) {
        return next(
          new ApiError(
            statusCode.BAD_REQUEST,
            err.details.map((d) => d.message).join(", ")
          )
        );
      }

      // ApiError or any other error
      return next(err);
    }
  };
};

module.exports = validate;
