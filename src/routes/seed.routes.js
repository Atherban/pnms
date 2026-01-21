const express = require("express");
const router = express.Router();

const seedController = require("../controllers/seed.controller");
const validate = require("../middlewares/validate.middleware");
const { createSeedSchema } = require("../validations/seed.validation");

router.post("/", validate(createSeedSchema), seedController.createSeed);
router.get("/", seedController.getSeeds);

module.exports = router;
