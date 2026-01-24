const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");

const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new ApiError(
        statusCode.BAD_REQUEST,
        error.details.map(d => d.message).join(", ")
      );
    }
    
    req[property] = value;
    next();
  };
};

module.exports = validate;
