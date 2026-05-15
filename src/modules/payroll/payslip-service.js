/**
 * Payslip PDF Service — Generate downloadable payslip PDFs
 */

const PDFDocument = require('pdfkit');
const { query, queryAll } = require('../../utils/mysql');
const ApiError = require('../../utils/apiError');

const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// ─── Generate Payslip PDF ───────────────────────────────────────────
const generatePayslipPdf = async (schoolId, recordId) => {
  // Fetch record with employee details
  const record = await query(
    `SELECT prec.*, e.name AS employee_name, e.employee_uid, e.department, e.role,
       e.designation, e.bank_name, e.bank_account, e.pan_number, e.email,
       pr.month, pr.year, pr.working_days AS run_working_days,
       s.name AS school_name, s.address AS school_address, s.logo_url
     FROM tbl_payroll_records prec
     INNER JOIN tbl_employees e ON e.id = prec.employee_id AND e.school_id = prec.school_id
     INNER JOIN tbl_payroll_runs pr ON pr.id = prec.payroll_run_id AND pr.school_id = prec.school_id
     INNER JOIN tbl_schools s ON s.id = prec.school_id
     WHERE prec.id = ? AND prec.school_id = ? LIMIT 1`,
    [recordId, schoolId]
  );
  if (!record) throw new ApiError(404, 'Payroll record not found');

  // Fetch line items
  const lineItems = await queryAll(
    `SELECT * FROM tbl_payroll_line_items
     WHERE payroll_record_id = ? AND school_id = ?
     ORDER BY type ASC, sort_order ASC, id ASC`,
    [recordId, schoolId]
  );

  const earnings = lineItems.filter(i => i.type === 'EARNING');
  const deductions = lineItems.filter(i => i.type === 'DEDUCTION');

  // Create PDF
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers = [];

      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const pageWidth = doc.page.width - 100;
      const monthYear = `${MONTHS[record.month]} ${record.year}`;

      // ── Header ──────────────────────────────────────────────
      doc.fontSize(18).font('Helvetica-Bold')
        .text(record.school_name || 'School ERP', { align: 'center' });

      if (record.school_address) {
        doc.fontSize(9).font('Helvetica')
          .text(record.school_address, { align: 'center' });
      }

      doc.moveDown(0.5);
      doc.fontSize(13).font('Helvetica-Bold')
        .text(`Payslip — ${monthYear}`, { align: 'center' });

      // Divider
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).stroke('#cccccc');
      doc.moveDown(0.5);

      // ── Employee Details ────────────────────────────────────
      const detailY = doc.y;
      const halfWidth = pageWidth / 2;

      doc.fontSize(9).font('Helvetica');

      const drawRow = (label, value, x, y) => {
        doc.font('Helvetica-Bold').text(label, x, y, { width: 100, continued: false });
        doc.font('Helvetica').text(value || '-', x + 105, y);
      };

      let y = detailY;
      drawRow('Employee ID:', record.employee_uid, 50, y);
      drawRow('Department:', record.department || '-', 50 + halfWidth, y);
      y += 18;
      drawRow('Name:', record.employee_name, 50, y);
      drawRow('Designation:', record.designation || record.role, 50 + halfWidth, y);
      y += 18;
      drawRow('PAN:', record.pan_number || '-', 50, y);
      drawRow('Bank A/C:', record.bank_account ? `${record.bank_name || ''} ${record.bank_account}` : '-', 50 + halfWidth, y);
      y += 18;
      drawRow('Working Days:', `${record.present_days} / ${record.working_days}`, 50, y);
      drawRow('Payment:', record.payment_status, 50 + halfWidth, y);

      doc.y = y + 30;

      // ── Earnings & Deductions Tables ────────────────────────
      const tableStartY = doc.y;
      const colWidth = (pageWidth - 10) / 2;

      // Earnings header
      doc.font('Helvetica-Bold').fontSize(10);
      doc.rect(50, tableStartY, colWidth, 22).fill('#2563eb');
      doc.fillColor('#ffffff').text('Earnings', 55, tableStartY + 6, { width: colWidth - 60 });
      doc.text('Amount', 55 + colWidth - 80, tableStartY + 6, { width: 70, align: 'right' });

      // Deductions header
      doc.rect(50 + colWidth + 10, tableStartY, colWidth, 22).fill('#dc2626');
      doc.fillColor('#ffffff').text('Deductions', 55 + colWidth + 10, tableStartY + 6, { width: colWidth - 60 });
      doc.text('Amount', 55 + colWidth + colWidth - 70, tableStartY + 6, { width: 70, align: 'right' });

      doc.fillColor('#000000');

      // Earnings rows
      let earningY = tableStartY + 28;
      doc.font('Helvetica').fontSize(9);
      for (const item of earnings) {
        const bgColor = earnings.indexOf(item) % 2 === 0 ? '#f8fafc' : '#ffffff';
        doc.rect(50, earningY, colWidth, 18).fill(bgColor);
        doc.fillColor('#333333').text(item.component_name, 55, earningY + 4, { width: colWidth - 80 });
        doc.text(`₹${Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 55 + colWidth - 80, earningY + 4, { width: 70, align: 'right' });
        earningY += 18;
      }

      // Deductions rows
      let deductionY = tableStartY + 28;
      for (const item of deductions) {
        const bgColor = deductions.indexOf(item) % 2 === 0 ? '#f8fafc' : '#ffffff';
        doc.rect(50 + colWidth + 10, deductionY, colWidth, 18).fill(bgColor);
        doc.fillColor('#333333').text(item.component_name, 55 + colWidth + 10, deductionY + 4, { width: colWidth - 80 });
        doc.text(`₹${Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 55 + colWidth + colWidth - 70, deductionY + 4, { width: 70, align: 'right' });
        deductionY += 18;
      }

      // Totals
      const totalY = Math.max(earningY, deductionY) + 4;
      doc.font('Helvetica-Bold').fontSize(9);

      doc.rect(50, totalY, colWidth, 20).fill('#e0e7ff');
      doc.fillColor('#1e40af')
        .text('Total Earnings', 55, totalY + 5, { width: colWidth - 80 })
        .text(`₹${Number(record.gross_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 55 + colWidth - 80, totalY + 5, { width: 70, align: 'right' });

      doc.rect(50 + colWidth + 10, totalY, colWidth, 20).fill('#fee2e2');
      doc.fillColor('#991b1b')
        .text('Total Deductions', 55 + colWidth + 10, totalY + 5, { width: colWidth - 80 })
        .text(`₹${Number(record.total_deductions).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 55 + colWidth + colWidth - 70, totalY + 5, { width: 70, align: 'right' });

      // Net Salary
      const netY = totalY + 30;
      doc.rect(50, netY, pageWidth, 28).fill('#1e3a5f');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(12)
        .text('Net Salary', 60, netY + 7, { width: pageWidth / 2 })
        .text(`₹${Number(record.net_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          50, netY + 7, { width: pageWidth - 10, align: 'right' });

      // Footer
      doc.fillColor('#999999').font('Helvetica').fontSize(7);
      doc.text(
        'This is a system-generated payslip. No signature required.',
        50, doc.page.height - 60,
        { align: 'center', width: pageWidth }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generatePayslipPdf
};
