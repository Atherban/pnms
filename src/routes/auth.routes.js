const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const validate = require("../middlewares/validate.middleware");
const authenticate = require("../middlewares/auth.middleware");
const {
  loginSchema,
  changePasswordSchema
} = require("../validations/auth.validation");

router.post("/login", validate(loginSchema), authController.login);
router.post("/change-password", authenticate, validate(changePasswordSchema), authController.changePassword);

module.exports = router;
