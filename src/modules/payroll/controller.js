/**
 * Payroll Controller — HTTP handlers for all payroll endpoints
 */

const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/apiResponse');
const { logAction } = require('../audit/service');
const { query } = require('../../utils/mysql');
const ApiError = require('../../utils/apiError');

const employeeService = require('./employee-service');
const salaryStructureService = require('./salary-structure-service');
const attendanceService = require('./attendance-service');
const payrollService = require('./payroll-service');
const paymentService = require('./payment-service');
const payslipService = require('./payslip-service');
const reportService = require('./payroll-report-service');

// ═══════════════════════════════════════════════════════════════════
// EMPLOYEES
// ═══════════════════════════════════════════════════════════════════

const createEmployee = asyncHandler(async (req, res) => {
  const result = await employeeService.createEmployee(req.schoolId, req.body);
  await logAction(req.schoolId, req.user.adminId, 'EMPLOYEE_CREATED', 'EMPLOYEE', result.id, { name: req.body.name, role: req.body.role }, req.ip);
  return sendSuccess(res, { statusCode: 201, message: 'Employee created', data: result });
});

const getEmployees = asyncHandler(async (req, res) => {
  const result = await employeeService.getAllEmployees(req.schoolId, req.query);
  return sendSuccess(res, { message: 'Employees fetched', data: result });
});

const getEmployee = asyncHandler(async (req, res, next) => {
  const employeeId = await resolveEmployeeId(req.schoolId, req.params.id);
  if (!employeeId) return next(new ApiError(404, 'Employee not found'));
  
  const result = await employeeService.getEmployee(req.schoolId, employeeId);
  return sendSuccess(res, { message: 'Employee fetched', data: result });
});

const updateEmployee = asyncHandler(async (req, res, next) => {
  const employeeId = await resolveEmployeeId(req.schoolId, req.params.id);
  if (!employeeId) return next(new ApiError(404, 'Employee not found'));

  const result = await employeeService.updateEmployee(req.schoolId, employeeId, { ...req.body, changedBy: req.user.adminId });
  await logAction(req.schoolId, req.user.adminId, 'EMPLOYEE_UPDATED', 'EMPLOYEE', result.id, { name: result.name }, req.ip);
  return sendSuccess(res, { message: 'Employee updated', data: result });
});

const deleteEmployee = asyncHandler(async (req, res, next) => {
  const employeeId = await resolveEmployeeId(req.schoolId, req.params.id);
  if (!employeeId) return next(new ApiError(404, 'Employee not found'));

  const result = await employeeService.deleteEmployee(req.schoolId, employeeId);
  await logAction(req.schoolId, req.user.adminId, 'EMPLOYEE_DEACTIVATED', 'EMPLOYEE', employeeId, {}, req.ip);
  return sendSuccess(res, { message: result.message });
});

const getDepartments = asyncHandler(async (req, res) => {
  const result = await employeeService.getDepartments(req.schoolId);
  return sendSuccess(res, { message: 'Departments fetched', data: result });
});

// ═══════════════════════════════════════════════════════════════════
// SALARY STRUCTURES
// ═══════════════════════════════════════════════════════════════════

const createSalaryStructure = asyncHandler(async (req, res) => {
  const result = await salaryStructureService.createSalaryStructure(req.schoolId, req.body);
  await logAction(req.schoolId, req.user.adminId, 'SALARY_STRUCTURE_CREATED', 'SALARY_STRUCTURE', result.id, { name: req.body.name }, req.ip);
  return sendSuccess(res, { statusCode: 201, message: 'Salary structure created', data: result });
});

const getSalaryStructures = asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true';
  const result = await salaryStructureService.getAllSalaryStructures(req.schoolId, includeInactive);
  return sendSuccess(res, { message: 'Salary structures fetched', data: result });
});

const getSalaryStructure = asyncHandler(async (req, res) => {
  const result = await salaryStructureService.getSalaryStructure(req.schoolId, Number(req.params.id));
  return sendSuccess(res, { message: 'Salary structure fetched', data: result });
});

const updateSalaryStructure = asyncHandler(async (req, res) => {
  const result = await salaryStructureService.updateSalaryStructure(req.schoolId, Number(req.params.id), req.body);
  await logAction(req.schoolId, req.user.adminId, 'SALARY_STRUCTURE_UPDATED', 'SALARY_STRUCTURE', result.id, { name: result.name }, req.ip);
  return sendSuccess(res, { message: 'Salary structure updated', data: result });
});

const deleteSalaryStructure = asyncHandler(async (req, res) => {
  const result = await salaryStructureService.deleteSalaryStructure(req.schoolId, Number(req.params.id));
  await logAction(req.schoolId, req.user.adminId, 'SALARY_STRUCTURE_DELETED', 'SALARY_STRUCTURE', Number(req.params.id), {}, req.ip);
  return sendSuccess(res, { message: result.message });
});

// ═══════════════════════════════════════════════════════════════════
// ATTENDANCE
// ═══════════════════════════════════════════════════════════════════

const markAttendance = asyncHandler(async (req, res) => {
  const result = await attendanceService.markAttendance(req.schoolId, req.body);
  return sendSuccess(res, { message: result.message });
});

const bulkMarkAttendance = asyncHandler(async (req, res) => {
  const result = await attendanceService.bulkMarkAttendance(req.schoolId, req.body);
  return sendSuccess(res, { message: result.message, data: { processed: result.processed } });
});

const resolveEmployeeId = async (schoolId, idOrUid) => {
  if (!isNaN(idOrUid)) return Number(idOrUid);
  const emp = await query('SELECT id FROM tbl_employees WHERE employee_uid = ? AND school_id = ?', [idOrUid, schoolId]);
  return emp ? emp.id : null;
};

const getAttendanceByDate = asyncHandler(async (req, res) => {
  const result = await attendanceService.getAttendanceByDate(req.schoolId, req.params.date);
  return sendSuccess(res, { message: 'Attendance fetched', data: result });
});

const getEmployeeAttendance = asyncHandler(async (req, res, next) => {
  const empId = await resolveEmployeeId(req.schoolId, req.params.id);
  if (!empId) return next(new ApiError(404, 'Employee not found'));

  const result = await attendanceService.getEmployeeAttendance(
    req.schoolId, empId, Number(req.query.month), Number(req.query.year)
  );
  return sendSuccess(res, { message: 'Employee attendance fetched', data: result });
});

const getAttendanceSummary = asyncHandler(async (req, res, next) => {
  const empId = await resolveEmployeeId(req.schoolId, req.params.id);
  if (!empId) return next(new ApiError(404, 'Employee not found'));

  const result = await attendanceService.getAttendanceSummary(
    req.schoolId, empId, Number(req.query.month), Number(req.query.year)
  );
  return sendSuccess(res, { message: 'Attendance summary fetched', data: result });
});

// ═══════════════════════════════════════════════════════════════════
// PAYROLL
// ═══════════════════════════════════════════════════════════════════

const generatePayroll = asyncHandler(async (req, res) => {
  const result = await payrollService.generatePayroll(
    req.schoolId, req.body.month, req.body.year, req.body.workingDays || 26, req.user.adminId
  );
  await logAction(req.schoolId, req.user.adminId, 'PAYROLL_GENERATED', 'PAYROLL_RUN', result.id, { month: req.body.month, year: req.body.year }, req.ip);
  return sendSuccess(res, { statusCode: 201, message: 'Payroll generated', data: result });
});

const getPayrollRuns = asyncHandler(async (req, res) => {
  const result = await payrollService.getPayrollHistory(req.schoolId, req.query);
  return sendSuccess(res, { message: 'Payroll history fetched', data: result });
});

const getPayrollRun = asyncHandler(async (req, res) => {
  const result = await payrollService.getPayrollRun(req.schoolId, Number(req.params.id));
  return sendSuccess(res, { message: 'Payroll run fetched', data: result });
});

const finalizePayroll = asyncHandler(async (req, res) => {
  const result = await payrollService.finalizePayroll(req.schoolId, Number(req.params.id));
  await logAction(req.schoolId, req.user.adminId, 'PAYROLL_FINALIZED', 'PAYROLL_RUN', result.id, {}, req.ip);
  return sendSuccess(res, { message: 'Payroll finalized', data: result });
});

const deletePayrollRun = asyncHandler(async (req, res) => {
  const result = await payrollService.deletePayrollRun(req.schoolId, Number(req.params.id));
  await logAction(req.schoolId, req.user.adminId, 'PAYROLL_DELETED', 'PAYROLL_RUN', Number(req.params.id), {}, req.ip);
  return sendSuccess(res, { message: result.message });
});

const getEmployeePayrollHistory = asyncHandler(async (req, res, next) => {
  const employeeId = await resolveEmployeeId(req.schoolId, req.params.id);
  if (!employeeId) return next(new ApiError(404, 'Employee not found'));
  
  const result = await payrollService.getEmployeePayrollHistory(req.schoolId, employeeId);
  return sendSuccess(res, { message: 'Employee payroll history fetched', data: result });
});

const getPayrollRecordDetail = asyncHandler(async (req, res) => {
  const result = await payrollService.getPayrollRecordDetail(req.schoolId, Number(req.params.id));
  return sendSuccess(res, { message: 'Payroll record fetched', data: result });
});

// ═══════════════════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════════════════

const markRecordPaid = asyncHandler(async (req, res) => {
  const result = await paymentService.markAsPaid(req.schoolId, Number(req.params.id), req.body);
  await logAction(req.schoolId, req.user.adminId, 'SALARY_PAID', 'PAYROLL_RECORD', Number(req.params.id), { paymentMethod: req.body.paymentMethod }, req.ip);
  return sendSuccess(res, { message: result.message });
});

const bulkMarkPaid = asyncHandler(async (req, res) => {
  const result = await paymentService.bulkMarkAsPaid(req.schoolId, Number(req.params.id), req.body);
  await logAction(req.schoolId, req.user.adminId, 'SALARY_BULK_PAID', 'PAYROLL_RUN', Number(req.params.id), {}, req.ip);
  return sendSuccess(res, { message: result.message });
});

const getPaymentStatus = asyncHandler(async (req, res) => {
  const result = await paymentService.getPaymentStatus(req.schoolId, Number(req.params.id));
  return sendSuccess(res, { message: 'Payment status fetched', data: result });
});

// ═══════════════════════════════════════════════════════════════════
// PAYSLIPS
// ═══════════════════════════════════════════════════════════════════

const downloadPayslip = asyncHandler(async (req, res) => {
  const pdfBuffer = await payslipService.generatePayslipPdf(req.schoolId, Number(req.params.id));

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=payslip-${req.params.id}.pdf`);
  res.setHeader('Content-Length', pdfBuffer.length);
  return res.end(pdfBuffer);
});

// ═══════════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════════

const getPayrollSummary = asyncHandler(async (req, res) => {
  const result = await reportService.getPayrollSummary(req.schoolId, Number(req.query.month), Number(req.query.year));
  return sendSuccess(res, { message: 'Payroll summary fetched', data: result });
});

const getDepartmentWiseSalary = asyncHandler(async (req, res) => {
  const result = await reportService.getDepartmentWiseSalary(req.schoolId, Number(req.query.month), Number(req.query.year));
  return sendSuccess(res, { message: 'Department-wise salary fetched', data: result });
});

const getPayrollDashboard = asyncHandler(async (req, res) => {
  const result = await reportService.getPayrollDashboard(req.schoolId);
  return sendSuccess(res, { message: 'Payroll dashboard fetched', data: result });
});

const getEmployeeSalaryHistory = asyncHandler(async (req, res, next) => {
  const employeeId = await resolveEmployeeId(req.schoolId, req.params.id);
  if (!employeeId) return next(new ApiError(404, 'Employee not found'));
  
  const result = await reportService.getEmployeeSalaryHistory(req.schoolId, employeeId);
  return sendSuccess(res, { message: 'Salary history fetched', data: result });
});

module.exports = {
  // Employees
  createEmployee, getEmployees, getEmployee, updateEmployee, deleteEmployee, getDepartments,
  // Salary Structures
  createSalaryStructure, getSalaryStructures, getSalaryStructure, updateSalaryStructure, deleteSalaryStructure,
  // Attendance
  markAttendance, bulkMarkAttendance, getAttendanceByDate, getEmployeeAttendance, getAttendanceSummary,
  // Payroll
  generatePayroll, getPayrollRuns, getPayrollRun, finalizePayroll, deletePayrollRun,
  getEmployeePayrollHistory, getPayrollRecordDetail,
  // Payments
  markRecordPaid, bulkMarkPaid, getPaymentStatus,
  // Payslips
  downloadPayslip,
  // Reports
  getPayrollSummary, getDepartmentWiseSalary, getPayrollDashboard, getEmployeeSalaryHistory
};
