const statusCode = require("../enums/statusCode");
const customerSeedBatchService = require("../services/customerSeedBatch.service");

const createCustomerSeedBatch = async (req, res, next) => {
  try {
    const batch = await customerSeedBatchService.createCustomerSeedBatch(req.body, req.user);
    res.status(statusCode.CREATED).json({
      message: "Customer seed batch created successfully",
      data: batch
    });
  } catch (err) {
    next(err);
  }
};

const getCustomerSeedBatches = async (req, res, next) => {
  try {
    const batches = await customerSeedBatchService.getCustomerSeedBatches(req.user);
    res.status(statusCode.OK).json({
      message: "Customer seed batches retrieved successfully",
      data: batches
    });
  } catch (err) {
    next(err);
  }
};

const getCustomerSeedBatchById = async (req, res, next) => {
  try {
    const batch = await customerSeedBatchService.getCustomerSeedBatchById(req.params.id, req.user);
    res.status(statusCode.OK).json({
      message: "Customer seed batch retrieved successfully",
      data: batch
    });
  } catch (err) {
    next(err);
  }
};

const updateCustomerSeedBatch = async (req, res, next) => {
  try {
    const batch = await customerSeedBatchService.updateCustomerSeedBatch(
      req.params.id,
      req.body,
      req.user
    );
    res.status(statusCode.OK).json({
      message: "Customer seed batch updated successfully",
      data: batch
    });
  } catch (err) {
    next(err);
  }
};

const markReadyCustomerSeedBatch = async (req, res, next) => {
  try {
    const batch = await customerSeedBatchService.markReadyCustomerSeedBatch(req.params.id, req.user);
    res.status(statusCode.OK).json({
      message: "Customer seed batch marked ready and service sale generated",
      data: batch
    });
  } catch (err) {
    next(err);
  }
};

const collectCustomerSeedBatch = async (req, res, next) => {
  try {
    const batch = await customerSeedBatchService.collectCustomerSeedBatch(req.params.id, req.user);
    res.status(statusCode.OK).json({
      message: "Customer seed batch marked collected",
      data: batch
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createCustomerSeedBatch,
  getCustomerSeedBatches,
  getCustomerSeedBatchById,
  updateCustomerSeedBatch,
  markReadyCustomerSeedBatch,
  collectCustomerSeedBatch
};
