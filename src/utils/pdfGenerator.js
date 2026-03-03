const escapePdfText = (value) => String(value ?? "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const buildMinimalPdfBuffer = ({ title, metaRows = [], sections = [] }) => {
  const lines = [];
  lines.push(title || "Report");
  lines.push("");
  for (const row of metaRows) {
    lines.push(`${row.label}: ${row.value ?? "-"}`);
  }
  lines.push("");
  for (const section of sections) {
    lines.push(section.title || "Section");
    const headers = Array.isArray(section.headers) ? section.headers : [];
    const rows = Array.isArray(section.rows) ? section.rows : [];
    if (!headers.length || !rows.length) {
      lines.push("No records");
      lines.push("");
      continue;
    }
    lines.push(headers.join(" | "));
    for (const row of rows) {
      lines.push(headers.map((header) => String(row?.[header] ?? "-")).join(" | "));
    }
    lines.push("");
  }

  // Minimal single-page PDF (Helvetica text stream).
  const yStart = 800;
  const contentLines = lines.map((line, idx) => `BT /F1 10 Tf 40 ${yStart - idx * 14} Td (${escapePdfText(line)}) Tj ET`).join("\n");
  const stream = `${contentLines}\n`;
  const streamLength = Buffer.byteLength(stream, "utf8");

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${streamLength} >> stream\n${stream}endstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj"
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${obj}\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
};

const buildSimplePdfBuffer = async ({ title, metaRows = [], sections = [] }) => {
  let PDFDocument;
  try {
    PDFDocument = require("pdfkit");
  } catch (error) {
    return buildMinimalPdfBuffer({ title, metaRows, sections });
  }

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  return new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text(title || "Report", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);

    for (const row of metaRows) {
      doc.text(`${row.label}: ${row.value ?? "-"}`);
    }

    doc.moveDown(0.8);
    for (const section of sections) {
      doc.fontSize(13).text(section.title || "Section");
      doc.moveDown(0.3);

      const headers = Array.isArray(section.headers) ? section.headers : [];
      const rows = Array.isArray(section.rows) ? section.rows : [];
      if (!headers.length || !rows.length) {
        doc.fontSize(10).text("No records");
        doc.moveDown(0.5);
        continue;
      }

      doc.fontSize(9).text(headers.join(" | "));
      doc.moveDown(0.2);
      for (const row of rows) {
        const line = headers.map((header) => String(row?.[header] ?? "-")).join(" | ");
        doc.text(line);
      }
      doc.moveDown(0.7);
    }

    doc.end();
  });
};

module.exports = {
  buildSimplePdfBuffer
};
