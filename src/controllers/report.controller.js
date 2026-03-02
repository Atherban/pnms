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
  exportReport,
  downloadReport
};
