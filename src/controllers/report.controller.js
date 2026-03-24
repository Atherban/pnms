const statusCode = require("../enums/statusCode");
const reportService = require("../services/report.service");

const exportReport = async (req, res, next) => {
  try {
    const report = await reportService.exportReport(req.body, req.user);
    res.status(statusCode.CREATED).json({
      message: "Report export generated successfully",
      data: {
        reportId: report._id,
        status: report.status,
        fileName: report.file?.name
      }
    });
  } catch (err) {
    next(err);
  }
};

const getAnalytics = async (req, res, next) => {
  try {
    const data = await reportService.getAnalyticsOverview({
      user: req.user,
      nurseryId: req.query.nurseryId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      staffId: req.query.staffId,
      plantTypeId: req.query.plantTypeId,
      customerId: req.query.customerId
    });
    res.status(statusCode.OK).json({
      message: "Report analytics retrieved successfully",
      data
    });
  } catch (err) {
    next(err);
  }
};

const getStructuredReport = async (req, res, next) => {
  try {
    const data = await reportService.getStructuredReportData(
      {
        reportType: req.query.reportType,
        nurseryId: req.query.nurseryId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        staffId: req.query.staffId,
        plantTypeId: req.query.plantTypeId,
        customerId: req.query.customerId
      },
      req.user
    );
    res.status(statusCode.OK).json({
      message: "Structured report data retrieved successfully",
      data
    });
  } catch (err) {
    next(err);
  }
};

const downloadReportByFormat = (format) => async (req, res, next) => {
  try {
    const file = await reportService.downloadReportFile(
      {
        reportType: req.query.reportType,
        nurseryId: req.query.nurseryId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        staffId: req.query.staffId,
        plantTypeId: req.query.plantTypeId,
        customerId: req.query.customerId
      },
      req.user,
      format
    );
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename=\"${file.fileName}\"`);
    res.status(statusCode.OK).send(file.buffer);
  } catch (err) {
    next(err);
  }
};

const downloadReport = async (req, res, next) => {
  try {
    const report = await reportService.getReportJob(req.params.id, req.user);
    if (!report || !report.file || !report.file.contentBase64) {
      return res.status(statusCode.NOT_FOUND).json({ message: "Report not ready" });
    }

    const buffer = Buffer.from(report.file.contentBase64, "base64");
    res.setHeader("Content-Type", report.file.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename=\"${report.file.name}\"`);
    res.status(statusCode.OK).send(buffer);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAnalytics,
  getStructuredReport,
  downloadReportPdf: downloadReportByFormat("PDF"),
  downloadReportExcel: downloadReportByFormat("XLSX"),
  exportReport,
  downloadReport
};
