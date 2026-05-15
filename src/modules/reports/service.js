const { queryAll } = require('../../utils/mysql');
const { generatePdfReport, generateExcelReport } = require('../../utils/reportGenerator');

const REPORT_TYPES = {
  FEE_COLLECTION: 'fee-collection',
  PENDING_FEES: 'pending-fees',
  CLASS_STUDENTS: 'class-students',
  ADMISSIONS: 'admissions'
};

const feeCollectionReport = async (schoolId, filters) => {
  const conditions = ['fp.school_id = ?'];
  const params = [schoolId];

  if (filters.from) {
    conditions.push('fp.payment_date >= ?');
    params.push(new Date(filters.from));
  }
  if (filters.to) {
    conditions.push('fp.payment_date <= ?');
    params.push(new Date(filters.to));
  }

  const rows = await queryAll(
    `SELECT fp.id, s.student_uid, s.name AS student_name, s.class, s.section,
       fp.amount, fp.late_fee, fp.total_paid, fp.payment_mode, fp.payment_date,
       fs.name AS fee_type
     FROM tbl_fee_payments fp
     INNER JOIN tbl_students s ON s.id = fp.student_id
     INNER JOIN tbl_fee_assignments fa ON fa.id = fp.fee_assignment_id
     INNER JOIN tbl_fee_structures fs ON fs.id = fa.fee_structure_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY fp.payment_date DESC`,
    params
  );

  const columns = [
    { header: 'Student UID', key: 'student_uid', width: 18 },
    { header: 'Name', key: 'student_name', width: 22 },
    { header: 'Class', key: 'class', width: 8 },
    { header: 'Section', key: 'section', width: 8 },
    { header: 'Fee Type', key: 'fee_type', width: 15 },
    { header: 'Amount', key: 'amount', width: 12 },
    { header: 'Late Fee', key: 'late_fee', width: 10 },
    { header: 'Total Paid', key: 'total_paid', width: 12 },
    { header: 'Mode', key: 'payment_mode', width: 10 },
    { header: 'Date', key: 'payment_date', width: 18 }
  ];

  return { title: 'Fee Collection Report', columns, rows };
};

const pendingFeesReport = async (schoolId) => {
  const rows = await queryAll(
    `SELECT s.student_uid, s.name AS student_name, s.class, s.section,
       fs.name AS fee_type, fa.net_amount, fa.paid_amount,
       (fa.net_amount - fa.paid_amount) AS balance, fa.due_date, fa.status
     FROM tbl_fee_assignments fa
     INNER JOIN tbl_students s ON s.id = fa.student_id
     INNER JOIN tbl_fee_structures fs ON fs.id = fa.fee_structure_id
     WHERE fa.school_id = ? AND fa.status IN ('PENDING', 'PARTIAL', 'OVERDUE')
     ORDER BY fa.due_date ASC`,
    [schoolId]
  );

  const columns = [
    { header: 'Student UID', key: 'student_uid', width: 18 },
    { header: 'Name', key: 'student_name', width: 22 },
    { header: 'Class', key: 'class', width: 8 },
    { header: 'Section', key: 'section', width: 8 },
    { header: 'Fee Type', key: 'fee_type', width: 15 },
    { header: 'Net Amount', key: 'net_amount', width: 12 },
    { header: 'Paid', key: 'paid_amount', width: 12 },
    { header: 'Balance', key: 'balance', width: 12 },
    { header: 'Due Date', key: 'due_date', width: 14 },
    { header: 'Status', key: 'status', width: 10 }
  ];

  return { title: 'Pending Fees Report', columns, rows };
};

const classStudentsReport = async (schoolId, filters) => {
  const conditions = ['school_id = ?', "status = 'ACTIVE'"];
  const params = [schoolId];

  if (filters.class) {
    conditions.push('class = ?');
    params.push(filters.class);
  }
  if (filters.section) {
    conditions.push('section = ?');
    params.push(filters.section);
  }

  const rows = await queryAll(
    `SELECT student_uid, name, class, section, stream, gender, parent_name, phone, email, date_of_birth
     FROM tbl_students
     WHERE ${conditions.join(' AND ')}
     ORDER BY class ASC, section ASC, name ASC`,
    params
  );

  const columns = [
    { header: 'Student UID', key: 'student_uid', width: 18 },
    { header: 'Name', key: 'name', width: 22 },
    { header: 'Class', key: 'class', width: 8 },
    { header: 'Section', key: 'section', width: 8 },
    { header: 'Stream', key: 'stream', width: 12 },
    { header: 'Gender', key: 'gender', width: 8 },
    { header: 'Parent', key: 'parent_name', width: 20 },
    { header: 'Phone', key: 'phone', width: 14 },
    { header: 'Email', key: 'email', width: 22 },
    { header: 'DOB', key: 'date_of_birth', width: 14 }
  ];

  return { title: `Student List — Class ${filters.class || 'All'}`, columns, rows };
};

const admissionsReport = async (schoolId, filters) => {
  const conditions = ['school_id = ?'];
  const params = [schoolId];

  if (filters.from) {
    conditions.push('created_at >= ?');
    params.push(new Date(filters.from));
  }
  if (filters.to) {
    conditions.push('created_at <= ?');
    params.push(new Date(filters.to));
  }
  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }

  const rows = await queryAll(
    `SELECT student_name, class, section, stream, admission_type, parent_name, phone, email, status, created_at
     FROM tbl_admissions
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC`,
    params
  );

  const columns = [
    { header: 'Name', key: 'student_name', width: 22 },
    { header: 'Class', key: 'class', width: 8 },
    { header: 'Section', key: 'section', width: 8 },
    { header: 'Stream', key: 'stream', width: 12 },
    { header: 'Type', key: 'admission_type', width: 12 },
    { header: 'Parent', key: 'parent_name', width: 20 },
    { header: 'Phone', key: 'phone', width: 14 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Applied On', key: 'created_at', width: 18 }
  ];

  return { title: 'Admissions Report', columns, rows };
};

/**
 * Generate report data and convert to buffer
 */
const generateReport = async (schoolId, reportType, filters = {}) => {
  let reportData;
  switch (reportType) {
    case REPORT_TYPES.FEE_COLLECTION:
      reportData = await feeCollectionReport(schoolId, filters);
      break;
    case REPORT_TYPES.PENDING_FEES:
      reportData = await pendingFeesReport(schoolId);
      break;
    case REPORT_TYPES.CLASS_STUDENTS:
      reportData = await classStudentsReport(schoolId, filters);
      break;
    case REPORT_TYPES.ADMISSIONS:
      reportData = await admissionsReport(schoolId, filters);
      break;
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }

  const format = (filters.format || 'pdf').toLowerCase();
  let buffer, contentType, extension;

  if (format === 'excel' || format === 'xlsx') {
    buffer = await generateExcelReport(reportData.title, reportData.columns, reportData.rows);
    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    extension = 'xlsx';
  } else {
    buffer = await generatePdfReport(reportData.title, reportData.columns, reportData.rows, { landscape: true });
    contentType = 'application/pdf';
    extension = 'pdf';
  }

  return { buffer, contentType, extension, title: reportData.title };
};

module.exports = { generateReport, REPORT_TYPES };
