const statusCode = require("../enums/statusCode");
const nurseryService = require("../services/nursery.service");
const { removeUploadedFile } = require("../utils/uploadFile.util");
const { normalizeNurserySettingsResponse } = require("../utils/nurserySettingsResponse.util");

const createNursery = async (req, res, next) => {
  try {
    const nursery = await nurseryService.createNursery(req.body, req.user);
    res.status(statusCode.CREATED).json({
      message: "Nursery created successfully",
      data: normalizeNurserySettingsResponse(nursery, req)
    });
  } catch (err) {
    next(err);
  }
};

const getNurseries = async (req, res, next) => {
  try {
    const nurseries = await nurseryService.getNurseries();
    res.status(statusCode.OK).json({
      message: "Nurseries retrieved successfully",
      data: nurseries.map((nursery) => normalizeNurserySettingsResponse(nursery, req))
    });
  } catch (err) {
    next(err);
  }
};

const getNurseryById = async (req, res, next) => {
  try {
    const nursery = await nurseryService.getNurseryById(req.params.id, req.user);
    res.status(statusCode.OK).json({
      message: "Nursery retrieved successfully",
      data: normalizeNurserySettingsResponse(nursery, req)
    });
  } catch (err) {
    next(err);
  }
};

const updateNursery = async (req, res, next) => {
  try {
    const nursery = await nurseryService.updateNursery(req.params.id, req.body, req.user.userId);
    res.status(statusCode.OK).json({
      message: "Nursery updated successfully",
      data: normalizeNurserySettingsResponse(nursery, req)
    });
  } catch (err) {
    next(err);
  }
};

const deleteNursery = async (req, res, next) => {
  try {
    const nursery = await nurseryService.deleteNursery(req.params.id, req.user.userId);
    res.status(statusCode.OK).json({
      message: "Nursery deleted successfully",
      data: normalizeNurserySettingsResponse(nursery, req)
    });
  } catch (err) {
    next(err);
  }
};

const updateNurseryPaymentConfig = async (req, res, next) => {
  try {
    const nursery = await nurseryService.updatePaymentConfig(req.params.id, req.body, req.user);
    res.status(statusCode.OK).json({
      message: "Nursery payment configuration updated successfully",
      data: normalizeNurserySettingsResponse(nursery, req)
    });
  } catch (err) {
    next(err);
  }
};

const uploadNurseryPaymentQr = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(statusCode.BAD_REQUEST).json({ message: "Image file is required" });
    }
    const nursery = await nurseryService.uploadPaymentQrImage(req.params.id, req.file, req.user);
    res.status(statusCode.OK).json({
      message: "Payment QR uploaded successfully",
      data: normalizeNurserySettingsResponse(nursery, req)
    });
  } catch (err) {
    if (req.file?.filename) {
      await removeUploadedFile(req.file.filename);
    }
    next(err);
  }
};

const addPublicContact = async (req, res, next) => {
  try {
    const nursery = await nurseryService.addPublicContact(req.params.id, req.body, req.file, req.user);
    res.status(statusCode.CREATED).json({
      message: "Public contact added successfully",
      data: normalizeNurserySettingsResponse(nursery, req)
    });
  } catch (err) {
    if (req.file?.filename) {
      await removeUploadedFile(req.file.filename);
    }
    next(err);
  }
};

const updatePublicContact = async (req, res, next) => {
  try {
    const nursery = await nurseryService.updatePublicContact(
      req.params.id,
      req.params.contactId,
      req.body,
      req.file,
      req.user
    );
    res.status(statusCode.OK).json({
      message: "Public contact updated successfully",
      data: normalizeNurserySettingsResponse(nursery, req)
    });
  } catch (err) {
    if (req.file?.filename) {
      await removeUploadedFile(req.file.filename);
    }
    next(err);
  }
};

const uploadPublicContactQr = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(statusCode.BAD_REQUEST).json({ message: "Image file is required" });
    }
    const nursery = await nurseryService.updatePublicContact(
      req.params.id,
      req.params.contactId,
      {},
      req.file,
      req.user
    );
    res.status(statusCode.OK).json({
      message: "Public contact QR uploaded successfully",
      data: normalizeNurserySettingsResponse(nursery, req)
    });
  } catch (err) {
    if (req.file?.filename) {
      await removeUploadedFile(req.file.filename);
    }
    next(err);
  }
};

const removePublicContact = async (req, res, next) => {
  try {
    const nursery = await nurseryService.removePublicContact(req.params.id, req.params.contactId, req.user);
    res.status(statusCode.OK).json({
      message: "Public contact removed successfully",
      data: normalizeNurserySettingsResponse(nursery, req)
    });
  } catch (err) {
    next(err);
  }
};

const assignAdmin = async (req, res, next) => {
  try {
    const assignment = await nurseryService.assignAdmin(req.params.id, req.body, req.user.userId);
    res.status(statusCode.OK).json({
      message: "Admin assigned successfully",
      data: assignment
    });
  } catch (err) {
    next(err);
  }
};

const getNurseryAdmins = async (req, res, next) => {
  try {
    const admins = await nurseryService.getNurseryAdmins(req.params.id);
    res.status(statusCode.OK).json({
      message: "Nursery admins retrieved successfully",
      data: admins
    });
  } catch (err) {
    next(err);
  }
};

const removeNurseryAdmin = async (req, res, next) => {
  try {
    const assignment = await nurseryService.removeAdmin(req.params.id, req.params.adminId, req.user.userId);
    res.status(statusCode.OK).json({
      message: "Admin removed from nursery successfully",
      data: assignment
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createNursery,
  getNurseries,
  getNurseryById,
  updateNursery,
  deleteNursery,
  updateNurseryPaymentConfig,
  uploadNurseryPaymentQr,
  addPublicContact,
  updatePublicContact,
  uploadPublicContactQr,
  removePublicContact,
  assignAdmin,
  getNurseryAdmins,
  removeNurseryAdmin
};
