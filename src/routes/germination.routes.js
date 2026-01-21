const express = require("express");
const router = express.Router();

const validate = require("../middlewares/validate.middleware");
const { germinationSchema } = require("../validations/germination.validation");
const germinationController = require("../controllers/germination.controller");

router.post("/", validate(germinationSchema), germinationController.recordGermination);

module.exports = router;
