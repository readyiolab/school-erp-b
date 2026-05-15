/**
 * Payroll Routes — REST API endpoint definitions
 */

const express = require('express');
const controller = require('./controller');
const validationMiddleware = require('../../middleware/validationMiddleware');
const {
  createEmployeeValidation, updateEmployeeValidation, employeeIdParam,
  createSalaryStructureValidation, updateSalaryStructureValidation, structureIdParam,
  markAttendanceValidation, bulkAttendanceValidation, dateParam, attendanceQueryValidation,
  generatePayrollValidation, payrollRunIdParam, recordIdParam,
  markPaidValidation, bulkPayValidation,
  reportQueryValidation
} = require('./validation');

const router = express.Router();

// ── Employee Routes ─────────────────────────────────────────────────
router.post('/employees', createEmployeeValidation, validationMiddleware, controller.createEmployee);
router.get('/employees', controller.getEmployees);
router.get('/employees/departments', controller.getDepartments);
router.get('/employees/:id', employeeIdParam, validationMiddleware, controller.getEmployee);
router.put('/employees/:id', updateEmployeeValidation, validationMiddleware, controller.updateEmployee);
router.delete('/employees/:id', employeeIdParam, validationMiddleware, controller.deleteEmployee);

// ── Salary Structure Routes ─────────────────────────────────────────
router.post('/salary-structures', createSalaryStructureValidation, validationMiddleware, controller.createSalaryStructure);
router.get('/salary-structures', controller.getSalaryStructures);
router.get('/salary-structures/:id', structureIdParam, validationMiddleware, controller.getSalaryStructure);
router.put('/salary-structures/:id', updateSalaryStructureValidation, validationMiddleware, controller.updateSalaryStructure);
router.delete('/salary-structures/:id', structureIdParam, validationMiddleware, controller.deleteSalaryStructure);

// ── Attendance Routes ───────────────────────────────────────────────
router.post('/attendance', markAttendanceValidation, validationMiddleware, controller.markAttendance);
router.post('/attendance/bulk', bulkAttendanceValidation, validationMiddleware, controller.bulkMarkAttendance);
router.get('/attendance/date/:date', dateParam, validationMiddleware, controller.getAttendanceByDate);
router.get('/attendance/employee/:id', employeeIdParam, attendanceQueryValidation, validationMiddleware, controller.getEmployeeAttendance);
router.get('/attendance/summary/:id', employeeIdParam, attendanceQueryValidation, validationMiddleware, controller.getAttendanceSummary);

// ── Payroll Routes ──────────────────────────────────────────────────
router.post('/process', generatePayrollValidation, validationMiddleware, controller.generatePayroll);
router.get('/runs', controller.getPayrollRuns);
router.get('/runs/:id', payrollRunIdParam, validationMiddleware, controller.getPayrollRun);
router.put('/runs/:id/finalize', payrollRunIdParam, validationMiddleware, controller.finalizePayroll);
router.delete('/runs/:id', payrollRunIdParam, validationMiddleware, controller.deletePayrollRun);
router.get('/employee/:id/history', employeeIdParam, validationMiddleware, controller.getEmployeePayrollHistory);
router.get('/records/:id', recordIdParam, validationMiddleware, controller.getPayrollRecordDetail);

// ── Payment Routes ──────────────────────────────────────────────────
router.put('/records/:id/pay', markPaidValidation, validationMiddleware, controller.markRecordPaid);
router.put('/runs/:id/pay-all', bulkPayValidation, validationMiddleware, controller.bulkMarkPaid);
router.get('/runs/:id/payment-status', payrollRunIdParam, validationMiddleware, controller.getPaymentStatus);

// ── Payslip Routes ──────────────────────────────────────────────────
router.get('/records/:id/payslip', recordIdParam, validationMiddleware, controller.downloadPayslip);

// ── Report Routes ───────────────────────────────────────────────────
router.get('/reports/summary', reportQueryValidation, validationMiddleware, controller.getPayrollSummary);
router.get('/reports/department-wise', reportQueryValidation, validationMiddleware, controller.getDepartmentWiseSalary);
router.get('/reports/dashboard', controller.getPayrollDashboard);
router.get('/reports/employee/:id/salary-history', employeeIdParam, validationMiddleware, controller.getEmployeeSalaryHistory);

module.exports = router;
