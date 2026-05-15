const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

/**
 * Generate a PDF report from tabular data.
 * @param {string} title
 * @param {Array<{header: string, key: string, width?: number}>} columns
 * @param {Array<Object>} rows
 * @param {Object} [options]
 * @returns {Promise<Buffer>}
 */
const generatePdfReport = (title, columns, rows, options = {}) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: options.landscape ? 'landscape' : 'portrait' });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Title
    doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' });
    doc.moveDown(0.5);

    // Date
    doc.fontSize(9).font('Helvetica').fillColor('#666666')
      .text(`Generated: ${new Date().toLocaleString('en-IN')}`, { align: 'right' });
    doc.moveDown(1);

    // Table header
    const colWidths = columns.map((c) => c.width || Math.floor((doc.page.width - 80) / columns.length));
    let x = 40;
    const headerY = doc.y;

    doc.rect(x, headerY, colWidths.reduce((a, b) => a + b, 0), 20).fill('#2563EB');
    doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');

    columns.forEach((col, i) => {
      doc.text(col.header, x + 4, headerY + 5, { width: colWidths[i] - 8, align: 'left' });
      x += colWidths[i];
    });

    doc.moveDown(0.3);
    let currentY = headerY + 22;

    // Table rows
    doc.font('Helvetica').fontSize(8).fillColor('#333333');

    rows.forEach((row, rowIdx) => {
      if (currentY > doc.page.height - 60) {
        doc.addPage();
        currentY = 40;
      }

      x = 40;
      const bgColor = rowIdx % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
      doc.rect(x, currentY, colWidths.reduce((a, b) => a + b, 0), 18).fill(bgColor);
      doc.fillColor('#333333');

      columns.forEach((col, i) => {
        const value = row[col.key] !== undefined && row[col.key] !== null ? String(row[col.key]) : '-';
        doc.text(value, x + 4, currentY + 4, { width: colWidths[i] - 8, align: 'left' });
        x += colWidths[i];
      });

      currentY += 18;
    });

    // Summary
    doc.moveDown(2);
    doc.fontSize(9).fillColor('#666666').text(`Total records: ${rows.length}`, 40);

    doc.end();
  });
};

/**
 * Generate an Excel report from tabular data.
 * @param {string} title
 * @param {Array<{header: string, key: string, width?: number}>} columns
 * @param {Array<Object>} rows
 * @returns {Promise<Buffer>}
 */
const generateExcelReport = async (title, columns, rows) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'School ERP';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(title.substring(0, 31));

  // Title row
  sheet.mergeCells(1, 1, 1, columns.length);
  const titleCell = sheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { size: 14, bold: true, color: { argb: 'FF2563EB' } };
  titleCell.alignment = { horizontal: 'center' };

  // Date row
  sheet.mergeCells(2, 1, 2, columns.length);
  const dateCell = sheet.getCell('A2');
  dateCell.value = `Generated: ${new Date().toLocaleString('en-IN')}`;
  dateCell.font = { size: 9, italic: true, color: { argb: 'FF999999' } };
  dateCell.alignment = { horizontal: 'right' };

  // Header row
  const headerRow = sheet.getRow(4);
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    cell.alignment = { horizontal: 'left' };
    sheet.getColumn(i + 1).width = col.width || 18;
  });

  // Data rows
  rows.forEach((row, idx) => {
    const dataRow = sheet.getRow(5 + idx);
    columns.forEach((col, i) => {
      const cell = dataRow.getCell(i + 1);
      cell.value = row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : '-';
      if (idx % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });
  });

  return workbook.xlsx.writeBuffer();
};

module.exports = { generatePdfReport, generateExcelReport };
