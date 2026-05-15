const PDFDocument = require('pdfkit');

/**
 * Generate a simple, reliable receipt PDF without Puppeteer/Chromium.
 * This avoids Windows spawn/permission issues and produces a valid PDF buffer.
 */
const generateReceiptPdf = ({
  schoolName,
  receiptNumber,
  studentName,
  amount,
  paymentDate,
  items = []
}) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];

    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor('#0F172A')
      .text(schoolName || 'School', { align: 'left' });

    doc
      .moveDown(0.25)
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#475569')
      .text('Fee Receipt', { align: 'left' });

    doc.moveDown(1);

    // Receipt meta box
    const boxTop = doc.y;
    const boxLeft = 40;
    const boxWidth = doc.page.width - 80;
    const boxHeight = 110;

    doc.roundedRect(boxLeft, boxTop, boxWidth, boxHeight, 10).fill('#F8FAFC');
    doc.roundedRect(boxLeft, boxTop, boxWidth, boxHeight, 10).stroke('#E2E8F0');

    const labelColor = '#64748B';
    const valueColor = '#0F172A';

    const safeAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
    const safeDate = paymentDate ? new Date(paymentDate) : new Date();

    const rows = [
      ['Receipt No', receiptNumber || '-'],
      ['Student Name', studentName || '-'],
      ['Amount Paid', `INR ${safeAmount.toFixed(2)}`],
      ['Payment Date', safeDate.toLocaleDateString('en-IN')]
    ];

    let y = boxTop + 16;
    rows.forEach(([label, value]) => {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(labelColor)
        .text(label, boxLeft + 16, y, { width: 140 });

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(valueColor)
        .text(String(value), boxLeft + 160, y, { width: boxWidth - 176 });

      y += 22;
    });

    doc.moveDown(8);

    if (items.length > 0) {
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#0F172A')
        .text('Fee Breakdown', { align: 'left' });

      doc.moveDown(0.5);

      const tableLeft = 40;
      const tableWidth = doc.page.width - 80;
      const columns = [tableLeft, tableLeft + 240, tableLeft + 340, tableLeft + 450];

      doc
        .rect(tableLeft, doc.y, tableWidth, 22)
        .fill('#E2E8F0');

      const headerY = doc.y + 6;
      doc
        .fillColor('#0F172A')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('Head', columns[0] + 8, headerY)
        .text('Amount', columns[1] + 8, headerY)
        .text('Discount', columns[2] + 8, headerY)
        .text('Paid', columns[3] + 8, headerY);

      let y = doc.y + 22;
      items.forEach((item, index) => {
        doc
          .rect(tableLeft, y, tableWidth, 22)
          .fill(index % 2 === 0 ? '#F8FAFC' : '#FFFFFF');

        doc
          .fillColor('#0F172A')
          .font('Helvetica')
          .fontSize(9)
          .text(item.itemName || '-', columns[0] + 8, y + 6, { width: 220 })
          .text(`INR ${Number(item.amount || 0).toFixed(2)}`, columns[1] + 8, y + 6)
          .text(`INR ${Number(item.discountAmount || 0).toFixed(2)}`, columns[2] + 8, y + 6)
          .text(`INR ${Number(item.paidAmount || 0).toFixed(2)}`, columns[3] + 8, y + 6);

        y += 22;
      });

      doc.y = y + 12;
    }

    // Footer note
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#64748B')
      .text('This receipt is generated electronically and is valid without signature.', {
        align: 'left'
      });

    doc.end();
  });

module.exports = { generateReceiptPdf };
