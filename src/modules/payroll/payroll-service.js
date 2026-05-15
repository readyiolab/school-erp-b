/**
 * Payroll Service — Core payroll processing engine
 *
 * Handles monthly payroll generation with:
 * - Pro-rated salary based on attendance
 * - Fixed and percentage-based component calculations
 * - Paid leave treated as present days
 * - Half-day treated as 0.5 days
 */

const { connectDb, insert, query, queryAll, update } = require('../../utils/mysql');
const ApiError = require('../../utils/apiError');
const { mapPayrollRun, mapPayrollRecord, mapPayrollLineItem } = require('../../utils/mappers');
const { getAttendanceSummary } = require('./attendance-service');

// ─── Calculate salary for a single employee ─────────────────────────
const calculateEmployeeSalary = async (schoolId, employeeId, structureId, workingDays, month, year) => {
  // Get salary components
  const components = await queryAll(
    `SELECT * FROM tbl_salary_components
     WHERE salary_structure_id = ? AND school_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [structureId, schoolId]
  );

  if (components.length === 0) {
    return { earnings: [], deductions: [], baseSalary: 0, grossSalary: 0, totalDeductions: 0, netSalary: 0 };
  }

  // Get attendance summary
  const attendance = await getAttendanceSummary(schoolId, employeeId, month, year);
  const effectiveDays = Math.min(attendance.effectivePresentDays, workingDays);
  const attendanceRatio = workingDays > 0 ? effectiveDays / workingDays : 1;

  // Find basic salary component
  const basicComponent = components.find(
    c => c.type === 'EARNING' && c.name.toLowerCase().includes('basic')
  );
  const baseSalary = basicComponent ? Number(basicComponent.value) : 0;
  const proRatedBasic = Math.round(baseSalary * attendanceRatio * 100) / 100;

  const earnings = [];
  const deductions = [];
  let grossSalary = 0;
  let totalDeductions = 0;

  for (const comp of components) {
    let amount = 0;

    if (comp.calc_type === 'FIXED') {
      // Fixed amounts are pro-rated by attendance for earnings
      if (comp.type === 'EARNING') {
        amount = Math.round(Number(comp.value) * attendanceRatio * 100) / 100;
      } else {
        // Fixed deductions are not pro-rated
        amount = Number(comp.value);
      }
    } else if (comp.calc_type === 'PERCENTAGE') {
      // Percentage-based: calculate against the base (usually basic salary)
      const baseAmount = proRatedBasic; // percentage_of defaults to BASIC
      amount = Math.round((Number(comp.value) / 100) * baseAmount * 100) / 100;
    }

    const lineItem = {
      componentName: comp.name,
      type: comp.type,
      amount,
      sortOrder: comp.sort_order
    };

    if (comp.type === 'EARNING') {
      earnings.push(lineItem);
      grossSalary += amount;
    } else {
      deductions.push(lineItem);
      totalDeductions += amount;
    }
  }

  const netSalary = Math.round((grossSalary - totalDeductions) * 100) / 100;

  return {
    earnings,
    deductions,
    baseSalary: proRatedBasic,
    grossSalary: Math.round(grossSalary * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netSalary: Math.max(0, netSalary),
    attendance: {
      workingDays,
      presentDays: effectiveDays,
      leaveDays: attendance.paidLeave + attendance.unpaidLeave,
      absentDays: attendance.absent
    }
  };
};

// ─── Generate Payroll for All Employees ─────────────────────────────
const generatePayroll = async (schoolId, month, year, workingDays, adminId) => {
  // Check if payroll already exists for this month
  const existing = await query(
    'SELECT id, status FROM tbl_payroll_runs WHERE school_id = ? AND month = ? AND year = ? LIMIT 1',
    [schoolId, month, year]
  );
  if (existing) {
    throw new ApiError(409, `Payroll already exists for ${month}/${year} (status: ${existing.status})`);
  }

  // Get all active employees with salary structures
  const employees = await queryAll(
    `SELECT e.id, e.name, e.salary_structure_id
     FROM tbl_employees e
     WHERE e.school_id = ? AND e.status = 'ACTIVE' AND e.salary_structure_id IS NOT NULL`,
    [schoolId]
  );

  if (employees.length === 0) {
    throw new ApiError(400, 'No active employees with salary structures found');
  }

  const pool = await connectDb();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Create payroll run
    const [runResult] = await connection.query('INSERT INTO tbl_payroll_runs SET ?', {
      school_id: schoolId,
      month,
      year,
      working_days: workingDays,
      total_employees: employees.length,
      total_gross: 0,
      total_deductions: 0,
      total_net: 0,
      status: 'DRAFT',
      processed_by: adminId,
      processed_at: new Date()
    });

    const runId = runResult.insertId;
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    // Process each employee
    for (const emp of employees) {
      const calc = await calculateEmployeeSalary(schoolId, emp.id, emp.salary_structure_id, workingDays, month, year);

      // Insert payroll record
      const [recResult] = await connection.query('INSERT INTO tbl_payroll_records SET ?', {
        school_id: schoolId,
        payroll_run_id: runId,
        employee_id: emp.id,
        working_days: calc.attendance.workingDays,
        present_days: calc.attendance.presentDays,
        leave_days: calc.attendance.leaveDays,
        absent_days: calc.attendance.absentDays,
        base_salary: calc.baseSalary,
        gross_salary: calc.grossSalary,
        total_deductions: calc.totalDeductions,
        net_salary: calc.netSalary,
        payment_status: 'UNPAID'
      });

      const recordId = recResult.insertId;

      // Insert line items
      const allItems = [...calc.earnings, ...calc.deductions];
      for (const item of allItems) {
        await connection.query('INSERT INTO tbl_payroll_line_items SET ?', {
          school_id: schoolId,
          payroll_record_id: recordId,
          component_name: item.componentName,
          type: item.type,
          amount: item.amount,
          sort_order: item.sortOrder
        });
      }

      totalGross += calc.grossSalary;
      totalDeductions += calc.totalDeductions;
      totalNet += calc.netSalary;
    }

    // Update run totals
    await connection.query(
      `UPDATE tbl_payroll_runs SET total_gross = ?, total_deductions = ?, total_net = ?
       WHERE id = ? AND school_id = ?`,
      [
        Math.round(totalGross * 100) / 100,
        Math.round(totalDeductions * 100) / 100,
        Math.round(totalNet * 100) / 100,
        runId, schoolId
      ]
    );

    await connection.commit();
    return getPayrollRun(schoolId, runId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ─── Get Payroll Run with Records ───────────────────────────────────
const getPayrollRun = async (schoolId, runId) => {
  const run = await query(
    `SELECT pr.*, a.full_name AS processed_by_name
     FROM tbl_payroll_runs pr
     LEFT JOIN tbl_admins a ON a.id = pr.processed_by
     WHERE pr.id = ? AND pr.school_id = ? LIMIT 1`,
    [runId, schoolId]
  );
  if (!run) throw new ApiError(404, 'Payroll run not found');

  const records = await queryAll(
    `SELECT prec.*, e.name AS employee_name, e.employee_uid, e.department, e.role
     FROM tbl_payroll_records prec
     INNER JOIN tbl_employees e ON e.id = prec.employee_id AND e.school_id = prec.school_id
     WHERE prec.payroll_run_id = ? AND prec.school_id = ?
     ORDER BY e.name ASC`,
    [runId, schoolId]
  );

  return {
    ...mapPayrollRun(run),
    records: records.map(mapPayrollRecord)
  };
};

// ─── List Payroll Runs ──────────────────────────────────────────────
const getPayrollHistory = async (schoolId, filters = {}) => {
  let where = 'pr.school_id = ?';
  const params = [schoolId];

  if (filters.year) {
    where += ' AND pr.year = ?';
    params.push(filters.year);
  }
  if (filters.status) {
    where += ' AND pr.status = ?';
    params.push(filters.status);
  }

  const runs = await queryAll(
    `SELECT pr.*, a.full_name AS processed_by_name,
       (SELECT COUNT(*) FROM tbl_payroll_records rec WHERE rec.payroll_run_id = pr.id AND rec.payment_status = 'PAID') AS paid_count
     FROM tbl_payroll_runs pr
     LEFT JOIN tbl_admins a ON a.id = pr.processed_by
     WHERE ${where}
     ORDER BY pr.year DESC, pr.month DESC`,
    params
  );

  return runs.map(r => ({
    ...mapPayrollRun(r),
    paidCount: Number(r.paid_count || 0)
  }));
};

// ─── Finalize Payroll ───────────────────────────────────────────────
const finalizePayroll = async (schoolId, runId) => {
  const run = await query(
    'SELECT id, status FROM tbl_payroll_runs WHERE id = ? AND school_id = ? LIMIT 1',
    [runId, schoolId]
  );
  if (!run) throw new ApiError(404, 'Payroll run not found');
  if (run.status !== 'DRAFT') throw new ApiError(409, 'Only DRAFT payroll can be finalized');

  await update('tbl_payroll_runs', { status: 'PROCESSED' }, 'id = ? AND school_id = ?', [runId, schoolId]);
  return getPayrollRun(schoolId, runId);
};

// ─── Get Employee Payroll History ───────────────────────────────────
const getEmployeePayrollHistory = async (schoolId, employeeId) => {
  const records = await queryAll(
    `SELECT prec.*, pr.month, pr.year, pr.status AS run_status
     FROM tbl_payroll_records prec
     INNER JOIN tbl_payroll_runs pr ON pr.id = prec.payroll_run_id AND pr.school_id = prec.school_id
     WHERE prec.school_id = ? AND prec.employee_id = ?
     ORDER BY pr.year DESC, pr.month DESC`,
    [schoolId, employeeId]
  );

  return records.map(r => ({
    ...mapPayrollRecord(r),
    month: r.month,
    year: r.year,
    runStatus: r.run_status
  }));
};

// ─── Get Payroll Record with Line Items ─────────────────────────────
const getPayrollRecordDetail = async (schoolId, recordId) => {
  const record = await query(
    `SELECT prec.*, e.name AS employee_name, e.employee_uid, e.department, e.role, e.email,
       e.bank_name, e.bank_account, e.pan_number,
       pr.month, pr.year, pr.status AS run_status
     FROM tbl_payroll_records prec
     INNER JOIN tbl_employees e ON e.id = prec.employee_id AND e.school_id = prec.school_id
     INNER JOIN tbl_payroll_runs pr ON pr.id = prec.payroll_run_id AND pr.school_id = prec.school_id
     WHERE prec.id = ? AND prec.school_id = ? LIMIT 1`,
    [recordId, schoolId]
  );
  if (!record) throw new ApiError(404, 'Payroll record not found');

  const lineItems = await queryAll(
    `SELECT * FROM tbl_payroll_line_items
     WHERE payroll_record_id = ? AND school_id = ?
     ORDER BY type ASC, sort_order ASC, id ASC`,
    [recordId, schoolId]
  );

  return {
    ...mapPayrollRecord(record),
    month: record.month,
    year: record.year,
    runStatus: record.run_status,
    email: record.email,
    bankName: record.bank_name,
    bankAccount: record.bank_account,
    panNumber: record.pan_number,
    lineItems: lineItems.map(mapPayrollLineItem)
  };
};

// ─── Delete Draft Payroll ───────────────────────────────────────────
const deletePayrollRun = async (schoolId, runId) => {
  const run = await query(
    'SELECT id, status FROM tbl_payroll_runs WHERE id = ? AND school_id = ? LIMIT 1',
    [runId, schoolId]
  );
  if (!run) throw new ApiError(404, 'Payroll run not found');
  if (run.status !== 'DRAFT') throw new ApiError(409, 'Only DRAFT payroll runs can be deleted');

  const pool = await connectDb();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Delete line items first
    await connection.query(
      `DELETE li FROM tbl_payroll_line_items li
       INNER JOIN tbl_payroll_records r ON r.id = li.payroll_record_id
       WHERE r.payroll_run_id = ? AND r.school_id = ?`,
      [runId, schoolId]
    );
    await connection.query(
      'DELETE FROM tbl_payroll_records WHERE payroll_run_id = ? AND school_id = ?',
      [runId, schoolId]
    );
    await connection.query(
      'DELETE FROM tbl_payroll_runs WHERE id = ? AND school_id = ?',
      [runId, schoolId]
    );
    await connection.commit();
    return { message: 'Payroll run deleted' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  generatePayroll,
  getPayrollRun,
  getPayrollHistory,
  finalizePayroll,
  getEmployeePayrollHistory,
  getPayrollRecordDetail,
  deletePayrollRun
};
