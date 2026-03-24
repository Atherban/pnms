const escapePdfText = (value) => String(value ?? "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const asDate = new Date(value);
  if (typeof value === "string" && !Number.isNaN(asDate.getTime()) && value.includes("T")) {
    return asDate.toISOString().slice(0, 10);
  }
  return String(value);
};

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

const buildSimplePdfBuffer = async ({ title, metaRows = [], overview = null, sections = [] }) => {
  let PDFDocument;
  try {
    PDFDocument = require("pdfkit");
  } catch (error) {
    return buildMinimalPdfBuffer({ title, metaRows, sections });
  }

  const doc = new PDFDocument({ margin: 36, size: "A4", bufferPages: true });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  return new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const left = doc.page.margins.left;
    const right = pageWidth - doc.page.margins.right;
    const contentWidth = right - left;

    const ensureSpace = (heightNeeded = 40) => {
      if (doc.y + heightNeeded > pageHeight - doc.page.margins.bottom) {
        doc.addPage();
      }
    };

    const drawSectionTitle = (text) => {
      ensureSpace(28);
      doc.moveDown(0.2);
      doc.font("Helvetica-Bold").fontSize(13).fillColor("#0F172A").text(text, left, doc.y);
      doc.moveTo(left, doc.y + 4).lineTo(right, doc.y + 4).strokeColor("#D7E3F1").stroke();
      doc.moveDown(0.4);
    };

    const drawMetaGrid = () => {
      const boxGap = 12;
      const boxWidth = (contentWidth - boxGap) / 2;
      const boxHeight = 54;
      let x = left;
      let y = doc.y;

      metaRows.forEach((row, index) => {
        if (index > 0 && index % 2 === 0) {
          x = left;
          y += boxHeight + 10;
        }
        ensureSpace(boxHeight + 10);
        doc.roundedRect(x, y, boxWidth, boxHeight, 10).fillAndStroke("#F8FBFF", "#D6E4F0");
        doc.fillColor("#64748B").font("Helvetica").fontSize(9).text(row.label || "-", x + 12, y + 10, { width: boxWidth - 24 });
        doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(12).text(formatValue(row.value), x + 12, y + 24, {
          width: boxWidth - 24
        });
        x += boxWidth + boxGap;
      });

      doc.y = y + boxHeight + 8;
    };

    const summaryCards = overview
      ? [
          { label: "Total Sales", value: formatValue(overview.sales?.totalSales), tone: "#1D4ED8" },
          { label: "Collected", value: formatValue(overview.sales?.totalPaid), tone: "#047857" },
          { label: "Due", value: formatValue(overview.sales?.totalDue), tone: "#B91C1C" },
          { label: "Profit", value: formatValue(overview.sales?.profit), tone: "#7C3AED" }
        ]
      : [];

    const drawSummaryCards = () => {
      if (!summaryCards.length) return;
      const gap = 10;
      const cardWidth = (contentWidth - gap * 3) / 4;
      const cardHeight = 72;
      ensureSpace(cardHeight + 8);
      summaryCards.forEach((card, index) => {
        const x = left + index * (cardWidth + gap);
        const y = doc.y;
        doc.roundedRect(x, y, cardWidth, cardHeight, 12).fillAndStroke("#FFFFFF", "#D6E4F0");
        doc.rect(x, y, 6, cardHeight).fill(card.tone);
        doc.fillColor("#64748B").font("Helvetica").fontSize(9).text(card.label, x + 14, y + 14, { width: cardWidth - 24 });
        doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(16).text(card.value, x + 14, y + 32, { width: cardWidth - 24 });
      });
      doc.y += cardHeight + 14;
    };

    const drawTable = (section) => {
      const headers = Array.isArray(section.headers) ? section.headers : [];
      const rows = Array.isArray(section.rows) ? section.rows : [];

      if (!headers.length || !rows.length) {
        doc.font("Helvetica").fontSize(10).fillColor("#64748B").text("No records available.", left, doc.y);
        doc.moveDown(0.8);
        return;
      }

      const prettyHeader = (header) =>
        String(header)
          .replace(/([a-z])([A-Z])/g, "$1 $2")
          .replace(/^./, (char) => char.toUpperCase());

      const weights = headers.map((header) => {
        if (/(sale|payment|status|customer|staff|plantType)/i.test(header)) return 1.5;
        if (/(date)/i.test(header)) return 1.2;
        return 1;
      });
      const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
      const colWidths = weights.map((weight) => (contentWidth / totalWeight) * weight);
      const rowHeight = 22;

      const drawHeader = () => {
        ensureSpace(rowHeight + 6);
        let x = left;
        doc.save();
        doc.roundedRect(left, doc.y, contentWidth, rowHeight, 6).fill("#EAF2FB");
        headers.forEach((header, index) => {
          doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(8).text(prettyHeader(header), x + 6, doc.y + 7, {
            width: colWidths[index] - 12,
            ellipsis: true
          });
          x += colWidths[index];
        });
        doc.restore();
        doc.y += rowHeight + 4;
      };

      drawHeader();

      rows.forEach((row, rowIndex) => {
        ensureSpace(rowHeight + 4);
        if (doc.y + rowHeight > pageHeight - doc.page.margins.bottom) {
          doc.addPage();
          drawHeader();
        }
        const bg = rowIndex % 2 === 0 ? "#FFFFFF" : "#F8FBFF";
        doc.rect(left, doc.y, contentWidth, rowHeight).fill(bg);
        let x = left;
        headers.forEach((header, index) => {
          doc.fillColor("#334155").font("Helvetica").fontSize(8.5).text(formatValue(row?.[header]), x + 6, doc.y + 7, {
            width: colWidths[index] - 12,
            ellipsis: true
          });
          x += colWidths[index];
        });
        doc.strokeColor("#E2E8F0").moveTo(left, doc.y + rowHeight).lineTo(right, doc.y + rowHeight).stroke();
        doc.y += rowHeight;
      });

      doc.moveDown(0.8);
    };

    doc.roundedRect(left, 24, contentWidth, 92, 18).fill("#0F4C81");
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(22).text(title || "Report", left + 20, 44);
    doc.font("Helvetica").fontSize(10).fillColor("#D9EBFF").text("Analytics dashboard export", left + 20, 74);
    doc.fillColor("#FFFFFF").fontSize(9).text(`Generated ${new Date().toISOString().slice(0, 10)}`, right - 110, 48, {
      width: 90,
      align: "right"
    });
    doc.y = 132;

    drawMetaGrid();
    drawSummaryCards();

    for (const section of sections) {
      drawSectionTitle(section.title || "Section");
      drawTable(section);
    }

    doc.end();
  });
};

module.exports = {
  buildSimplePdfBuffer
};
