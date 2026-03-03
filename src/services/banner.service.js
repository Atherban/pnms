const Banner = require("../models/Banner.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");
const { removeUploadedFile } = require("../utils/uploadFile.util");

const PRIORITY_BY_SCOPE = {
  GLOBAL_SUPER_ADMIN: 2,
  NURSERY_ADMIN: 1
};

const getScopePriority = (scope) => PRIORITY_BY_SCOPE[scope] || 0;

const getWritableBannerQuery = (bannerId, user) => {
  const query = { _id: bannerId };

  if (user.role === "SUPER_ADMIN") {
    return query;
  }

  if (!user.nurseryId) {
    throw new ApiError(statusCode.FORBIDDEN, "User is not assigned to a nursery");
  }

  query.scope = "NURSERY_ADMIN";
  query.nurseryId = user.nurseryId;
  return query;
};

const normalizeBannerPayloadForRole = (payload, user) => {
  const nextPayload = { ...payload };

  if (user.role === "NURSERY_ADMIN") {
    if (nextPayload.scope && nextPayload.scope !== "NURSERY_ADMIN") {
      throw new ApiError(statusCode.FORBIDDEN, "NURSERY_ADMIN can only manage nursery banners");
    }

    nextPayload.scope = "NURSERY_ADMIN";
    nextPayload.nurseryId = user.nurseryId;
  }

  if (user.role === "SUPER_ADMIN" && nextPayload.scope === "NURSERY_ADMIN" && !nextPayload.nurseryId) {
    throw new ApiError(statusCode.BAD_REQUEST, "nurseryId is required for nursery-scoped banners");
  }
  if (user.role === "SUPER_ADMIN" && !nextPayload.scope) {
    throw new ApiError(statusCode.BAD_REQUEST, "scope is required");
  }

  if (nextPayload.scope === "GLOBAL_SUPER_ADMIN") {
    delete nextPayload.nurseryId;
  }

  return nextPayload;
};

const createBanner = async (payload, user) => {
  const normalizedPayload = normalizeBannerPayloadForRole(payload, user);
  const normalizedPriority = Number.isFinite(Number(normalizedPayload.priority))
    ? Number(normalizedPayload.priority)
    : getScopePriority(normalizedPayload.scope);
  const normalizedColor = String(normalizedPayload.color || "").trim() || "#0EA5E9";

  const banner = await Banner.create({
    scope: normalizedPayload.scope,
    nurseryId: normalizedPayload.nurseryId,
    title: normalizedPayload.title,
    subtitle: String(normalizedPayload.subtitle || "").trim() || undefined,
    cta: String(normalizedPayload.cta || "").trim() || undefined,
    color: normalizedColor,
    image: normalizedPayload.imageFileName
      ? { fileName: normalizedPayload.imageFileName, uploadedAt: new Date() }
      : undefined,
    redirectUrl: normalizedPayload.redirectUrl,
    priority: normalizedPriority,
    startAt: normalizedPayload.startAt,
    endAt: normalizedPayload.endAt,
    status: normalizedPayload.status,
    createdBy: user.userId
  });

  return banner;
};

const getActiveBanners = async (user, requestedNurseryId) => {
  const now = new Date();

  const nurseryId = user.role === "SUPER_ADMIN"
    ? (requestedNurseryId || null)
    : user.nurseryId;

  const globalBanners = await Banner.find({
    scope: "GLOBAL_SUPER_ADMIN",
    status: "ACTIVE",
    startAt: { $lte: now },
    endAt: { $gte: now }
  }).sort({ createdAt: -1 });

  const nurseryQuery = {
    scope: "NURSERY_ADMIN",
    status: "ACTIVE",
    startAt: { $lte: now },
    endAt: { $gte: now }
  };

  if (nurseryId) {
    nurseryQuery.nurseryId = nurseryId;
  }

  const nurseryBanners = await Banner.find(nurseryQuery).sort({ createdAt: -1 });

  return [...globalBanners, ...nurseryBanners].sort((a, b) => {
    const scopePriorityDiff = getScopePriority(b.scope) - getScopePriority(a.scope);
    if (scopePriorityDiff !== 0) {
      return scopePriorityDiff;
    }

    return b.createdAt - a.createdAt;
  });
};

const getBannersForAdmin = async (user, filters = {}) => {
  const query = {};

  if (user.role === "SUPER_ADMIN") {
    if (filters.scope) {
      query.scope = filters.scope;
    }
    if (filters.nurseryId) {
      query.nurseryId = filters.nurseryId;
    }
  } else {
    if (!user.nurseryId) {
      throw new ApiError(statusCode.FORBIDDEN, "User is not assigned to a nursery");
    }
    query.scope = "NURSERY_ADMIN";
    query.nurseryId = user.nurseryId;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  return Banner.find(query).sort({ priority: -1, updatedAt: -1, createdAt: -1 });
};

const getBanners = async (user, filters = {}) => {
  if (user.role === "SUPER_ADMIN" || user.role === "NURSERY_ADMIN") {
    return getBannersForAdmin(user, filters);
  }
  return getActiveBanners(user, filters.nurseryId);
};

const updateBanner = async (bannerId, payload, user) => {
  const existingBanner = await Banner.findOne(getWritableBannerQuery(bannerId, user));
  if (!existingBanner) {
    throw new ApiError(statusCode.NOT_FOUND, "Banner not found");
  }

  const update = { ...payload };
  if (update.color !== undefined) {
    const nextColor = String(update.color || "").trim();
    update.color = nextColor || "#0EA5E9";
  }
  if (update.subtitle !== undefined) {
    update.subtitle = String(update.subtitle || "").trim();
  }
  if (update.cta !== undefined) {
    update.cta = String(update.cta || "").trim();
  }

  if (update.priority !== undefined) {
    const parsedPriority = Number(update.priority);
    if (!Number.isFinite(parsedPriority)) {
      throw new ApiError(statusCode.BAD_REQUEST, "priority must be a valid number");
    }
    update.priority = parsedPriority;
  }
  delete update.scope;
  delete update.nurseryId;

  if (payload.imageFileName) {
    update.image = { fileName: payload.imageFileName, uploadedAt: new Date() };
    delete update.imageFileName;
  }

  const nextStartAt = update.startAt || existingBanner.startAt;
  const nextEndAt = update.endAt || existingBanner.endAt;
  if (nextEndAt <= nextStartAt) {
    throw new ApiError(statusCode.BAD_REQUEST, "endAt must be greater than startAt");
  }

  const banner = await Banner.findByIdAndUpdate(
    existingBanner._id,
    update,
    { new: true, runValidators: true }
  );

  if (!banner) {
    throw new ApiError(statusCode.NOT_FOUND, "Banner not found");
  }
  return banner;
};

const attachBannerImage = async (bannerId, file, user) => {
  const banner = await Banner.findOne(getWritableBannerQuery(bannerId, user));

  if (!banner) {
    throw new ApiError(statusCode.NOT_FOUND, "Banner not found");
  }

  const previousFileName = banner?.image?.fileName;
  banner.image = {
    fileName: file.filename,
    uploadedAt: new Date()
  };

  await banner.save();

  if (previousFileName && previousFileName !== file.filename) {
    await removeUploadedFile(previousFileName);
  }

  return banner;
};

const removeBannerImage = async (bannerId, user) => {
  const banner = await Banner.findOne(getWritableBannerQuery(bannerId, user));

  if (!banner) {
    throw new ApiError(statusCode.NOT_FOUND, "Banner not found");
  }

  const previousFileName = banner?.image?.fileName;
  if (!previousFileName) {
    return banner;
  }

  banner.image = undefined;
  await banner.save();
  await removeUploadedFile(previousFileName);

  return banner;
};

const deleteBanner = async (bannerId, user) => {
  const banner = await Banner.findOneAndDelete(getWritableBannerQuery(bannerId, user));

  if (!banner) {
    throw new ApiError(statusCode.NOT_FOUND, "Banner not found");
  }

  return banner;
};

module.exports = {
  createBanner,
  getBanners,
  getActiveBanners,
  updateBanner,
  attachBannerImage,
  removeBannerImage,
  deleteBanner
};
