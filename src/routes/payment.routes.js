const express = require("express");
const router = express.Router();

const paymentController = require("../controllers/payment.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/rbac.middleware");
const validate = require("../middlewares/validate.middleware");
const { upload } = require("../middlewares/upload.middleware");
const { objectIdSchema } = require("../validations/common.validation");
const {
  createPaymentSchema,
  verifyPaymentSchema
} = require("../validations/payment.validation");

router.post(
  "/",
  authenticate,
  authorize("NURSERY_ADMIN", "STAFF", "CUSTOMER", "SUPER_ADMIN"),
  upload.single("image"),
  validate(createPaymentSchema),
  paymentController.createPayment
);

router.get(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN", "STAFF"),
  paymentController.getPayments
);

router.post(
  "/:id/verify",
  authenticate,
  authorize("SUPER_ADMIN", "NURSERY_ADMIN"),
  validate(objectIdSchema, "params"),
  validate(verifyPaymentSchema),
  paymentController.verifyPayment
);

module.exports = router;
