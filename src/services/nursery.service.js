const mongoose = require("mongoose");
const Nursery = require("../models/Nursery.model");
const NurseryAdminAssignment = require("../models/NurseryAdminAssignment.model");
const User = require("../models/User.model");
const ApiError = require("../exceptions/ApiError");
const statusCode = require("../enums/statusCode");
const AuditLog = require("../models/AuditLog.model");
const { removeUploadedFile } = require("../utils/uploadFile.util");

const NURSERY_POPULATE = { path: "ownerSuperAdminId", select: "name email phoneNumber role" };
const ADMIN_ASSIGNMENT_POPULATE = [
  { path: "adminUserId", select: "name email phoneNumber role nurseryId isActive" },
  { path: "assignedBy", select: "name email phoneNumber role" }
];

const getAdminAssignmentCountForNursery = async (nurseryId, excludeAdminUserId, session) => {
  const query = { nurseryId };
  if (excludeAdminUserId) {
    query.adminUserId = { $ne: excludeAdminUserId };
  }
  return NurseryAdminAssignment.countDocuments(query).session(session);
};

const createNursery = async (payload, actorUser) => {
  if (!actorUser || actorUser.role !== "SUPER_ADMIN") {
    throw new ApiError(statusCode.FORBIDDEN, "Only SUPER_ADMIN can create nursery");
  }

  const exists = await Nursery.findOne({ code: payload.code });
  if (exists) {
    throw new ApiError(statusCode.CONFLICT, "Nursery with this code already exists");
  }

  const owner = await User.findById(actorUser.userId);
  if (!owner || owner.role !== "SUPER_ADMIN") {
    throw new ApiError(statusCode.BAD_REQUEST, "Invalid SUPER_ADMIN account");
  }

  const nursery = await Nursery.create({
    ...payload,
    createdBy: actorUser.userId,
    updatedBy: actorUser.userId,
    ownerSuperAdminId: actorUser.userId
  });
  return Nursery.findById(nursery._id).populate(NURSERY_POPULATE);
};

const getNurseries = async () => Nursery.find({ deletedAt: { $exists: false } })
  .populate(NURSERY_POPULATE)
  .sort({ createdAt: -1 });

const getNurseryById = async (nurseryId, user) => {
  await ensureNurseryAccess(nurseryId, user);
  const nursery = await Nursery.findById(nurseryId).populate(NURSERY_POPULATE);
  if (!nursery || nursery.deletedAt) {
    throw new ApiError(statusCode.NOT_FOUND, "Nursery not found");
  }
  return nursery;
};

const ensureNurseryAccess = async (nurseryId, user) => {
  if (!user) {
    throw new ApiError(statusCode.UNAUTHORIZED, "Authentication required");
  }

  if (user.role !== "SUPER_ADMIN") {
    if (!user.nurseryId) {
      throw new ApiError(statusCode.FORBIDDEN, "User is not assigned to a nursery");
    }
    if (String(user.nurseryId) !== String(nurseryId)) {
      throw new ApiError(statusCode.FORBIDDEN, "Cannot access another nursery");
    }
  }

  const nursery = await Nursery.findOne({ _id: nurseryId, deletedAt: { $exists: false } });
  if (!nursery) {
    throw new ApiError(statusCode.NOT_FOUND, "Nursery not found");
  }

  return nursery;
};

const ensurePrimaryAdminConfigAccess = async (nurseryId, user) => {
  const nursery = await ensureNurseryAccess(nurseryId, user);

  if (user.role === "SUPER_ADMIN") {
    return nursery;
  }

  if (user.role !== "NURSERY_ADMIN") {
    throw new ApiError(statusCode.FORBIDDEN, "Only primary nursery admin can update public profile");
  }

  const assignment = await NurseryAdminAssignment.findOne({
    nurseryId,
    adminUserId: user.userId,
    isPrimary: true
  });

  if (!assignment) {
    throw new ApiError(
      statusCode.FORBIDDEN,
      "Only primary nursery admin can configure payment and contact details"
    );
  }

  return nursery;
};

const updateNursery = async (nurseryId, payload, actorUserId) => {
  if (payload.code) {
    const exists = await Nursery.findOne({
      code: payload.code,
      _id: { $ne: nurseryId }
    });
    if (exists) {
      throw new ApiError(statusCode.CONFLICT, "Nursery with this code already exists");
    }
  }

  const nursery = await Nursery.findOneAndUpdate(
    { _id: nurseryId, deletedAt: { $exists: false } },
    {
      ...payload,
      updatedBy: actorUserId
    },
    { new: true, runValidators: true }
  ).populate(NURSERY_POPULATE);

  if (!nursery) {
    throw new ApiError(statusCode.NOT_FOUND, "Nursery not found");
  }

  return nursery;
};

const deleteNursery = async (nurseryId, actorUserId) => {
  const deletedAt = new Date();
  const nursery = await Nursery.findOneAndUpdate(
    { _id: nurseryId, deletedAt: { $exists: false } },
    {
      deletedAt,
      deletedBy: actorUserId,
      updatedBy: actorUserId,
      status: "SUSPENDED"
    },
    { new: true }
  ).populate(NURSERY_POPULATE);

  if (!nursery) {
    throw new ApiError(statusCode.NOT_FOUND, "Nursery not found");
  }

  await User.updateMany(
    {
      nurseryId: nursery._id,
      role: { $in: ["NURSERY_ADMIN", "STAFF", "CUSTOMER"] },
      deletedAt: { $exists: false }
    },
    {
      $set: {
        isActive: false,
        deletedAt,
        deletedBy: actorUserId,
        updatedBy: actorUserId
      }
    }
  );

  await AuditLog.create({
    nurseryId: nursery._id,
    actorUserId,
    action: "SOFT_DELETED",
    entityType: "Nursery",
    entityId: nursery._id,
    before: {
      status: "ACTIVE"
    },
    after: {
      status: nursery.status,
      deletedAt: nursery.deletedAt
    },
    occurredAt: new Date()
  });

  return nursery;
};

const assignAdmin = async (nurseryId, payload, actorUserId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const nursery = await Nursery.findById(nurseryId).session(session);
    if (!nursery || nursery.deletedAt) {
      throw new ApiError(statusCode.NOT_FOUND, "Nursery not found");
    }

    const adminUser = await User.findById(payload.adminUserId).session(session);
    if (!adminUser) {
      throw new ApiError(statusCode.NOT_FOUND, "Admin user not found");
    }

    if (adminUser.role !== "NURSERY_ADMIN") {
      throw new ApiError(statusCode.BAD_REQUEST, "User role must be NURSERY_ADMIN");
    }

    if (adminUser.isActive === false) {
      throw new ApiError(statusCode.BAD_REQUEST, "Inactive user cannot be assigned as nursery admin");
    }

    const allAssignmentsForAdmin = await NurseryAdminAssignment.find({
      adminUserId: payload.adminUserId
    }).session(session);

    const assignmentsOutsideTarget = allAssignmentsForAdmin.filter(
      (assignment) => String(assignment.nurseryId) !== String(nurseryId)
    );

    if (assignmentsOutsideTarget.length > 0) {
      const uniquePreviousNurseryIds = Array.from(
        new Set(assignmentsOutsideTarget.map((assignment) => String(assignment.nurseryId)))
      );

      for (const previousNurseryId of uniquePreviousNurseryIds) {
        const remainingAdminCount = await getAdminAssignmentCountForNursery(
          previousNurseryId,
          payload.adminUserId,
          session
        );
        if (remainingAdminCount <= 0) {
          throw new ApiError(
            statusCode.BAD_REQUEST,
            "Cannot reassign admin because it would orphan another nursery without any admin"
          );
        }
      }

      await NurseryAdminAssignment.deleteMany({
        adminUserId: payload.adminUserId,
        nurseryId: { $ne: nurseryId }
      }).session(session);
    }

    const requestedPrimary = payload.isPrimary === true;
    let assignment = await NurseryAdminAssignment.findOne({
      nurseryId,
      adminUserId: payload.adminUserId
    }).session(session);

    if (assignment) {
      assignment.isPrimary = requestedPrimary;
      assignment.assignedBy = assignment.assignedBy || actorUserId;
      await assignment.save({ session });
    } else {
      [assignment] = await NurseryAdminAssignment.create(
        [
          {
            nurseryId,
            adminUserId: payload.adminUserId,
            assignedBy: actorUserId,
            isPrimary: requestedPrimary
          }
        ],
        { session }
      );
    }

    if (requestedPrimary) {
      await NurseryAdminAssignment.updateMany(
        {
          nurseryId,
          _id: { $ne: assignment._id }
        },
        { $set: { isPrimary: false } },
        { session }
      );
    } else {
      const existingPrimary = await NurseryAdminAssignment.findOne({
        nurseryId,
        isPrimary: true
      }).session(session);

      if (!existingPrimary) {
        assignment.isPrimary = true;
        await assignment.save({ session });
      }
    }

    adminUser.nurseryId = nursery._id;
    await adminUser.save({ session });

    await AuditLog.create(
      [
        {
          nurseryId: nursery._id,
          actorUserId,
          action: "NURSERY_ADMIN_ASSIGNED",
          entityType: "NurseryAdminAssignment",
          entityId: assignment._id,
          before: null,
          after: {
            nurseryId,
            adminUserId: payload.adminUserId,
            isPrimary: assignment.isPrimary
          },
          occurredAt: new Date()
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return NurseryAdminAssignment.findById(assignment._id).populate(ADMIN_ASSIGNMENT_POPULATE);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const getNurseryAdmins = async (nurseryId) => {
  const nursery = await Nursery.findById(nurseryId);
  if (!nursery || nursery.deletedAt) {
    throw new ApiError(statusCode.NOT_FOUND, "Nursery not found");
  }

  return NurseryAdminAssignment.find({ nurseryId })
    .populate(ADMIN_ASSIGNMENT_POPULATE[0])
    .populate(ADMIN_ASSIGNMENT_POPULATE[1])
    .sort({ isPrimary: -1, createdAt: -1 });
};

const removeAdmin = async (nurseryId, adminUserId, actorUserId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const assignment = await NurseryAdminAssignment.findOne({
      nurseryId,
      adminUserId
    }).session(session);

    if (!assignment) {
      throw new ApiError(statusCode.NOT_FOUND, "Nursery admin assignment not found");
    }

    const totalAdminsInNursery = await NurseryAdminAssignment.countDocuments({ nurseryId }).session(session);
    if (totalAdminsInNursery <= 1) {
      throw new ApiError(
        statusCode.BAD_REQUEST,
        "Cannot remove the last nursery admin. Assign another admin first."
      );
    }

    await NurseryAdminAssignment.deleteOne({ _id: assignment._id }).session(session);

    if (assignment.isPrimary) {
      const fallbackAdmin = await NurseryAdminAssignment.findOne({ nurseryId })
        .sort({ createdAt: -1 })
        .session(session);
      if (fallbackAdmin) {
        fallbackAdmin.isPrimary = true;
        await fallbackAdmin.save({ session });
      }
    }

    const remainingAssignmentsForUser = await NurseryAdminAssignment.find({ adminUserId }).session(session);
    if (remainingAssignmentsForUser.length === 0) {
      await User.findByIdAndUpdate(adminUserId, { $unset: { nurseryId: 1 } }, { session });
    } else {
      await User.findByIdAndUpdate(
        adminUserId,
        { $set: { nurseryId: remainingAssignmentsForUser[0].nurseryId } },
        { session }
      );
    }

    await AuditLog.create(
      [
        {
          nurseryId,
          actorUserId,
          action: "NURSERY_ADMIN_REMOVED",
          entityType: "NurseryAdminAssignment",
          entityId: assignment._id,
          before: {
            nurseryId,
            adminUserId,
            isPrimary: assignment.isPrimary
          },
          after: {
            removed: true
          },
          occurredAt: new Date()
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();
    return assignment;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const updatePaymentConfig = async (nurseryId, payload, user) => {
  const nursery = await ensurePrimaryAdminConfigAccess(nurseryId, user);
  nursery.settings = nursery.settings || {};
  nursery.settings.paymentConfig = {
    ...(nursery.settings.paymentConfig || {}),
    ...payload
  };
  nursery.updatedBy = user.userId;
  await nursery.save();
  return nursery;
};

const uploadPaymentQrImage = async (nurseryId, file, user) => {
  const nursery = await ensurePrimaryAdminConfigAccess(nurseryId, user);
  nursery.settings = nursery.settings || {};
  nursery.settings.paymentConfig = nursery.settings.paymentConfig || {};

  const previousFileName = nursery.settings.paymentConfig.qrImage;
  nursery.settings.paymentConfig.qrImage = file.filename;
  nursery.updatedBy = user.userId;
  await nursery.save();

  if (previousFileName && previousFileName !== file.filename) {
    await removeUploadedFile(previousFileName);
  }

  return nursery;
};

const uploadBrandLogoImage = async (nurseryId, file, user) => {
  const nursery = await ensurePrimaryAdminConfigAccess(nurseryId, user);
  nursery.settings = nursery.settings || {};
  nursery.settings.branding = nursery.settings.branding || {};

  const previousFileName = nursery.settings.branding.logoImage;
  nursery.settings.branding.logoImage = file.filename;
  nursery.updatedBy = user.userId;
  await nursery.save();

  if (previousFileName && previousFileName !== file.filename) {
    await removeUploadedFile(previousFileName);
  }

  return nursery;
};

const addPublicContact = async (nurseryId, payload, file, user) => {
  const nursery = await ensurePrimaryAdminConfigAccess(nurseryId, user);
  nursery.settings = nursery.settings || {};
  nursery.settings.contactDetails = Array.isArray(nursery.settings.contactDetails)
    ? nursery.settings.contactDetails
    : [];

  const contact = {
    label: payload.label,
    phoneNumber: payload.phoneNumber,
    whatsappNumber: payload.whatsappNumber,
    email: payload.email,
    address: payload.address,
    qrImage: file?.filename
  };

  nursery.settings.contactDetails.push(contact);
  nursery.updatedBy = user.userId;
  await nursery.save();

  return nursery;
};

const updatePublicContact = async (nurseryId, contactId, payload, file, user) => {
  const nursery = await ensurePrimaryAdminConfigAccess(nurseryId, user);
  nursery.settings = nursery.settings || {};
  nursery.settings.contactDetails = Array.isArray(nursery.settings.contactDetails)
    ? nursery.settings.contactDetails
    : [];

  const contact = nursery.settings.contactDetails.id(contactId);
  if (!contact) {
    if (file?.filename) {
      await removeUploadedFile(file.filename);
    }
    throw new ApiError(statusCode.NOT_FOUND, "Public contact not found");
  }

  const previousFileName = contact.qrImage;
  if (payload.label !== undefined) contact.label = payload.label;
  if (payload.phoneNumber !== undefined) contact.phoneNumber = payload.phoneNumber;
  if (payload.whatsappNumber !== undefined) contact.whatsappNumber = payload.whatsappNumber;
  if (payload.email !== undefined) contact.email = payload.email;
  if (payload.address !== undefined) contact.address = payload.address;
  if (file?.filename) {
    contact.qrImage = file.filename;
  }

  nursery.updatedBy = user.userId;
  await nursery.save();

  if (file?.filename && previousFileName && previousFileName !== file.filename) {
    await removeUploadedFile(previousFileName);
  }

  return nursery;
};

const removePublicContact = async (nurseryId, contactId, user) => {
  const nursery = await ensurePrimaryAdminConfigAccess(nurseryId, user);
  nursery.settings = nursery.settings || {};
  nursery.settings.contactDetails = Array.isArray(nursery.settings.contactDetails)
    ? nursery.settings.contactDetails
    : [];

  const contact = nursery.settings.contactDetails.id(contactId);
  if (!contact) {
    throw new ApiError(statusCode.NOT_FOUND, "Public contact not found");
  }

  const qrFileName = contact.qrImage;
  contact.deleteOne();
  nursery.updatedBy = user.userId;
  await nursery.save();

  if (qrFileName) {
    await removeUploadedFile(qrFileName);
  }

  return nursery;
};

module.exports = {
  createNursery,
  getNurseries,
  getNurseryById,
  updateNursery,
  deleteNursery,
  assignAdmin,
  getNurseryAdmins,
  removeAdmin,
  updatePaymentConfig,
  uploadPaymentQrImage,
  uploadBrandLogoImage,
  addPublicContact,
  updatePublicContact,
  removePublicContact
};
