const express = require("express");
const router = express.Router();

const sowingController = require("../controllers/sowing.controller");
const validate = require("../middlewares/validate.middleware");
const { sowingSchema } = require("../validations/sowing.validation");

router.post("/", validate(sowingSchema), sowingController.sowSeeds);

module.exports = router;
