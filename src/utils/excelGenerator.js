const buildExcelBuffer = async ({ sheets = [] }) => {
  let ExcelJS;
  try {
    ExcelJS = require("exceljs");
  } catch (error) {
    const fallbackLines = [];
    for (const sheet of sheets || []) {
      fallbackLines.push(`# ${sheet?.name || "Sheet"}`);
      const columns = Array.isArray(sheet?.columns) ? sheet.columns : [];
      const rows = Array.isArray(sheet?.rows) ? sheet.rows : [];
      const headers = columns.map((column) => column?.header || column?.key || "");
      if (headers.length) fallbackLines.push(headers.join(","));
      for (const row of rows) {
        fallbackLines.push(
          columns.map((column) => String(row?.[column?.key] ?? "").replace(/,/g, " ")).join(",")
        );
      }
      fallbackLines.push("");
    }
    return Buffer.from(fallbackLines.join("\n"), "utf8");
  }

  const workbook = new ExcelJS.Workbook();

  for (const sheetConfig of sheets) {
    const worksheet = workbook.addWorksheet(sheetConfig.name || "Sheet");
    const columns = Array.isArray(sheetConfig.columns) ? sheetConfig.columns : [];
    worksheet.columns = columns.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width || 18
    }));

    const rows = Array.isArray(sheetConfig.rows) ? sheetConfig.rows : [];
    rows.forEach((row) => worksheet.addRow(row));
  }

  return workbook.xlsx.writeBuffer();
};

module.exports = {
  buildExcelBuffer
};
