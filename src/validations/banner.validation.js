const Joi = require("joi");

const createBannerSchema = Joi.object({
  scope: Joi.string().valid("GLOBAL_SUPER_ADMIN", "NURSERY_ADMIN").optional(),
  nurseryId: Joi.string().trim().empty("").hex().length(24).optional(),
  title: Joi.string().trim().min(2).max(120).required(),
  subtitle: Joi.string().trim().max(280).allow("").optional(),
  cta: Joi.string().trim().max(60).allow("").optional(),
  color: Joi.string().trim().pattern(/^#[0-9A-Fa-f]{6}$/).allow("").optional(),
  imageFileName: Joi.string().trim().empty("").optional(),
  redirectUrl: Joi.string().trim().uri().empty("").optional(),
  startAt: Joi.date().required(),
  endAt: Joi.date().greater(Joi.ref("startAt")).required(),
  status: Joi.string().valid("DRAFT", "ACTIVE", "INACTIVE", "EXPIRED").default("DRAFT")
});

const updateBannerSchema = Joi.object({
  title: Joi.string().trim().min(2).max(120).optional(),
  subtitle: Joi.string().trim().max(280).allow("").optional(),
  cta: Joi.string().trim().max(60).allow("").optional(),
  color: Joi.string().trim().pattern(/^#[0-9A-Fa-f]{6}$/).allow("").optional(),
  imageFileName: Joi.string().trim().empty("").optional(),
  redirectUrl: Joi.string().trim().uri().empty("").optional(),
  startAt: Joi.date().optional(),
  endAt: Joi.date().optional(),
  status: Joi.string().valid("DRAFT", "ACTIVE", "INACTIVE", "EXPIRED").optional()
})
  .custom((value, helpers) => {
    if (value.startAt && value.endAt && value.endAt <= value.startAt) {
      return helpers.message("endAt must be greater than startAt");
    }
    return value;
  })
  .min(1);

module.exports = {
  createBannerSchema,
  updateBannerSchema
};
