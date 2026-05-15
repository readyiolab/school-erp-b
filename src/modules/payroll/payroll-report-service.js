/**
 * Payroll Report Service — Dashboard KPIs and reports
 */

const { query, queryAll } = require('../../utils/mysql');
const { mapPayrollRecord } = require('../../utils/mappers');

// ─── Monthly Payroll Summary ────────────────────────────────────────
const getPayrollSummary = async (schoolId, month, year) => {
  const run = await query(
    `SELECT * FROM tbl_payroll_runs WHERE school_id = ? AND month = ? AND year = ? LIMIT 1`,
    [schoolId, month, year]
  );

  if (!run) {
    return {
      exists: false,
      month,
      year,
      totalEmployees: 0,
      totalGross: 0,
      totalDeductions: 0,
      totalNet: 0,
      paidCount: 0,
      unpaidCount: 0
    };
  }

  const paid = await query(
    `SELECT COUNT(*) AS cnt FROM tbl_payroll_records
     WHERE payroll_run_id = ? AND school_id = ? AND payment_status = 'PAID'`,
    [run.id, schoolId]
  );

  return {
    exists: true,
    month,
    year,
    status: run.status,
    totalEmployees: run.total_employees,
    totalGross: Number(run.total_gross),
    totalDeductions: Number(run.total_deductions),
    totalNet: Number(run.total_net),
    paidCount: Number(paid?.cnt || 0),
    unpaidCount: run.total_employees - Number(paid?.cnt || 0)
  };
};

// ─── Department-wise Salary Distribution ────────────────────────────
const getDepartmentWiseSalary = async (schoolId, month, year) => {
  const rows = await queryAll(
    `SELECT e.department, COUNT(*) AS employee_count,
       SUM(prec.gross_salary) AS total_gross,
       SUM(prec.total_deductions) AS total_deductions,
       SUM(prec.net_salary) AS total_net
     FROM tbl_payroll_records prec
     INNER JOIN tbl_payroll_runs pr ON pr.id = prec.payroll_run_id AND pr.school_id = prec.school_id
     INNER JOIN tbl_employees e ON e.id = prec.employee_id AND e.school_id = prec.school_id
     WHERE prec.school_id = ? AND pr.month = ? AND pr.year = ?
     GROUP BY e.department
     ORDER BY total_net DESC`,
    [schoolId, month, year]
  );

  return rows.map(r => ({
    department: r.department || 'Unassigned',
    employeeCount: Number(r.employee_count),
    totalGross: Number(r.total_gross),
    totalDeductions: Number(r.total_deductions),
    totalNet: Number(r.total_net)
  }));
};

// ─── Payroll Dashboard KPIs ─────────────────────────────────────────
const getPayrollDashboard = async (schoolId) => {
  // Total active employees
  const empCount = await query(
    "SELECT COUNT(*) AS cnt FROM tbl_employees WHERE school_id = ? AND status = 'ACTIVE'",
    [schoolId]
  );

  // Current month/year
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // This month's payroll
  const thisMonthRun = await query(
    'SELECT * FROM tbl_payroll_runs WHERE school_id = ? AND month = ? AND year = ? LIMIT 1',
    [schoolId, currentMonth, currentYear]
  );

  // Pending payments (unpaid records across all finalized runs)
  const pending = await query(
    `SELECT COUNT(*) AS cnt, COALESCE(SUM(prec.net_salary), 0) AS total
     FROM tbl_payroll_records prec
     INNER JOIN tbl_payroll_runs pr ON pr.id = prec.payroll_run_id AND pr.school_id = prec.school_id
     WHERE prec.school_id = ? AND prec.payment_status = 'UNPAID' AND pr.status != 'DRAFT'`,
    [schoolId]
  );

  // YTD expense (current year)
  const ytd = await query(
    `SELECT COALESCE(SUM(total_net), 0) AS total
     FROM tbl_payroll_runs WHERE school_id = ? AND year = ? AND status != 'DRAFT'`,
    [schoolId, currentYear]
  );

  // Monthly trend (last 12 months)
  const trend = await queryAll(
    `SELECT month, year, total_net, total_employees, status
     FROM tbl_payroll_runs
     WHERE school_id = ? AND status != 'DRAFT'
     ORDER BY year DESC, month DESC
     LIMIT 12`,
    [schoolId]
  );

  return {
    totalEmployees: Number(empCount?.cnt || 0),
    currentMonthPayroll: thisMonthRun ? Number(thisMonthRun.total_net) : 0,
    currentMonthStatus: thisMonthRun?.status || 'NOT_GENERATED',
    pendingPayments: Number(pending?.cnt || 0),
    pendingAmount: Number(pending?.total || 0),
    ytdExpense: Number(ytd?.total || 0),
    monthlyTrend: trend.reverse().map(t => ({
      month: t.month,
      year: t.year,
      totalNet: Number(t.total_net),
      totalEmployees: t.total_employees,
      status: t.status
    }))
  };
};

// ─── Employee Salary History ────────────────────────────────────────
const getEmployeeSalaryHistory = async (schoolId, employeeId) => {
  const records = await queryAll(
    `SELECT prec.net_salary, prec.gross_salary, prec.total_deductions,
       pr.month, pr.year
     FROM tbl_payroll_records prec
     INNER JOIN tbl_payroll_runs pr ON pr.id = prec.payroll_run_id AND pr.school_id = prec.school_id
     WHERE prec.school_id = ? AND prec.employee_id = ?
     ORDER BY pr.year ASC, pr.month ASC`,
    [schoolId, employeeId]
  );

  return records.map(r => ({
    month: r.month,
    year: r.year,
    grossSalary: Number(r.gross_salary),
    totalDeductions: Number(r.total_deductions),
    netSalary: Number(r.net_salary)
  }));
};

module.exports = {
  getPayrollSummary,
  getDepartmentWiseSalary,
  getPayrollDashboard,
  getEmployeeSalaryHistory
};
