/**
 * Attendance Service — Daily attendance tracking for employees
 */

const { insert, query, queryAll, update } = require('../../utils/mysql');
const ApiError = require('../../utils/apiError');
const { mapEmployeeAttendance } = require('../../utils/mappers');

// ─── Mark Single Attendance ─────────────────────────────────────────
const markAttendance = async (schoolId, payload) => {
  const employee = await query(
    'SELECT id FROM tbl_employees WHERE id = ? AND school_id = ? LIMIT 1',
    [payload.employeeId, schoolId]
  );
  if (!employee) throw new ApiError(404, 'Employee not found');

  // Upsert: insert or update if exists
  const existing = await query(
    'SELECT id FROM tbl_employee_attendance WHERE school_id = ? AND employee_id = ? AND date = ? LIMIT 1',
    [schoolId, payload.employeeId, payload.date]
  );

  if (existing) {
    await update('tbl_employee_attendance', {
      status: payload.status,
      leave_type: payload.leaveType || null,
      remarks: payload.remarks || null
    }, 'id = ? AND school_id = ?', [existing.id, schoolId]);
  } else {
    await insert('tbl_employee_attendance', {
      school_id: schoolId,
      employee_id: payload.employeeId,
      date: payload.date,
      status: payload.status,
      leave_type: payload.leaveType || null,
      remarks: payload.remarks || null
    });
  }

  return { message: 'Attendance marked' };
};

// ─── Bulk Mark Attendance ───────────────────────────────────────────
const bulkMarkAttendance = async (schoolId, payload) => {
  const { date, records } = payload;
  if (!Array.isArray(records) || records.length === 0) {
    throw new ApiError(400, 'Records array is required');
  }

  let processed = 0;
  for (const record of records) {
    await markAttendance(schoolId, {
      employeeId: record.employeeId,
      date,
      status: record.status,
      leaveType: record.leaveType || null,
      remarks: record.remarks || null
    });
    processed++;
  }

  return { message: `Attendance marked for ${processed} employees`, processed };
};

// ─── Get Attendance by Date ─────────────────────────────────────────
const getAttendanceByDate = async (schoolId, date) => {
  // Get all active employees with their attendance for the date
  const rows = await queryAll(
    `SELECT e.id AS employee_id, e.employee_uid, e.name, e.role, e.department,
       a.id AS attendance_id, a.status, a.leave_type, a.remarks, a.date
     FROM tbl_employees e
     LEFT JOIN tbl_employee_attendance a
       ON a.employee_id = e.id AND a.school_id = e.school_id AND a.date = ?
     WHERE e.school_id = ? AND e.status = 'ACTIVE'
     ORDER BY e.name ASC`,
    [date, schoolId]
  );

  return rows.map(row => ({
    employeeId: row.employee_id,
    employeeUid: row.employee_uid,
    name: row.name,
    role: row.role,
    department: row.department,
    attendanceId: row.attendance_id || null,
    date: date,
    status: row.status || null,
    leaveType: row.leave_type || null,
    remarks: row.remarks || null
  }));
};

// ─── Get Employee Monthly Attendance ────────────────────────────────
const getEmployeeAttendance = async (schoolId, employeeId, month, year) => {
  const employee = await query(
    'SELECT id, name FROM tbl_employees WHERE id = ? AND school_id = ? LIMIT 1',
    [employeeId, schoolId]
  );
  if (!employee) throw new ApiError(404, 'Employee not found');

  const records = await queryAll(
    `SELECT * FROM tbl_employee_attendance
     WHERE school_id = ? AND employee_id = ?
       AND MONTH(date) = ? AND YEAR(date) = ?
     ORDER BY date ASC`,
    [schoolId, employeeId, month, year]
  );

  return {
    employeeId,
    employeeName: employee.name,
    month,
    year,
    records: records.map(mapEmployeeAttendance)
  };
};

// ─── Get Attendance Summary for Payroll ─────────────────────────────
const getAttendanceSummary = async (schoolId, employeeId, month, year) => {
  const records = await queryAll(
    `SELECT status, leave_type FROM tbl_employee_attendance
     WHERE school_id = ? AND employee_id = ?
       AND MONTH(date) = ? AND YEAR(date) = ?`,
    [schoolId, employeeId, month, year]
  );

  let present = 0;
  let absent = 0;
  let paidLeave = 0;
  let unpaidLeave = 0;
  let halfDay = 0;

  for (const record of records) {
    switch (record.status) {
      case 'PRESENT':
        present++;
        break;
      case 'ABSENT':
        absent++;
        break;
      case 'LEAVE':
        if (record.leave_type === 'PAID' || record.leave_type === 'SICK' || record.leave_type === 'CASUAL') {
          paidLeave++;
        } else {
          unpaidLeave++;
        }
        break;
      case 'HALF_DAY':
        halfDay++;
        break;
    }
  }

  // Effective present days: full present + paid leave + half of half-days
  const effectivePresentDays = present + paidLeave + (halfDay * 0.5);

  return {
    present,
    absent,
    paidLeave,
    unpaidLeave,
    halfDay,
    totalMarked: records.length,
    effectivePresentDays
  };
};

module.exports = {
  markAttendance,
  bulkMarkAttendance,
  getAttendanceByDate,
  getEmployeeAttendance,
  getAttendanceSummary
};
