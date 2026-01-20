const statusCode = require("../enums/statusCode");  

const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: true,
      stripUnknown: true
    });

    if (error) {
      return res.status(statusCode.BAD_REQUEST).json({
        message: error.details[0]?.message || "Validation Error"
      });
    }

    req[property] = value;
    next();
  };
};

module.exports = validate;
