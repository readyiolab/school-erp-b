/**
 * Payroll Validation — express-validator rules for all payroll endpoints
 */

const { body, param, query } = require('express-validator');

// ── Employee ────────────────────────────────────────────────────────
const createEmployeeValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('role').optional().isIn(['TEACHER', 'ADMIN', 'STAFF']).withMessage('Invalid role'),
  body('email').optional({ nullable: true }).isEmail().withMessage('Invalid email'),
  body('phone').optional({ nullable: true }).isMobilePhone().withMessage('Invalid phone'),
  body('department').optional({ nullable: true }).trim(),
  body('designation').optional({ nullable: true }).trim(),
  body('joiningDate').optional({ nullable: true }).isISO8601().withMessage('Invalid date'),
  body('salaryStructureId').optional({ nullable: true }).isInt().withMessage('Invalid salary structure ID')
];

const updateEmployeeValidation = [
  param('id').notEmpty().withMessage('Employee ID is required'),
  body('name').optional().trim().notEmpty(),
  body('role').optional().isIn(['TEACHER', 'ADMIN', 'STAFF']),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'TERMINATED']),
  body('email').optional({ nullable: true }).isEmail(),
  body('salaryStructureId').optional({ nullable: true }).isInt()
];

const employeeIdParam = [
  param('id').notEmpty().withMessage('Employee ID is required')
];

// ── Salary Structure ────────────────────────────────────────────────
const createSalaryStructureValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').optional({ nullable: true }).trim(),
  body('components').isArray({ min: 1 }).withMessage('At least one component is required'),
  body('components.*.name').trim().notEmpty().withMessage('Component name is required'),
  body('components.*.type').isIn(['EARNING', 'DEDUCTION']).withMessage('Invalid component type'),
  body('components.*.calcType').optional().isIn(['FIXED', 'PERCENTAGE']).withMessage('Invalid calc type'),
  body('components.*.value').isFloat({ min: 0 }).withMessage('Value must be ≥ 0')
];

const updateSalaryStructureValidation = [
  param('id').isInt().withMessage('Invalid structure ID'),
  body('name').optional().trim().notEmpty(),
  body('components').optional().isArray()
];

const structureIdParam = [
  param('id').isInt().withMessage('Invalid structure ID')
];

// ── Attendance ──────────────────────────────────────────────────────
const markAttendanceValidation = [
  body('employeeId').isInt().withMessage('Employee ID is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('status').isIn(['PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY']).withMessage('Invalid attendance status'),
  body('leaveType').optional({ nullable: true }).isIn(['PAID', 'UNPAID', 'SICK', 'CASUAL'])
];

const bulkAttendanceValidation = [
  body('date').isISO8601().withMessage('Valid date is required'),
  body('records').isArray({ min: 1 }).withMessage('Records array is required'),
  body('records.*.employeeId').isInt().withMessage('Employee ID is required'),
  body('records.*.status').isIn(['PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY']).withMessage('Invalid status')
];

const dateParam = [
  param('date').isISO8601().withMessage('Valid date is required')
];

const attendanceQueryValidation = [
  query('month').isInt({ min: 1, max: 12 }).withMessage('Valid month (1-12) is required'),
  query('year').isInt({ min: 2020, max: 2100 }).withMessage('Valid year is required')
];

// ── Payroll ─────────────────────────────────────────────────────────
const generatePayrollValidation = [
  body('month').isInt({ min: 1, max: 12 }).withMessage('Valid month (1-12) is required'),
  body('year').isInt({ min: 2020, max: 2100 }).withMessage('Valid year is required'),
  body('workingDays').optional().isInt({ min: 1, max: 31 }).withMessage('Working days must be 1-31')
];

const payrollRunIdParam = [
  param('id').isInt().withMessage('Invalid payroll run ID')
];

const recordIdParam = [
  param('id').isInt().withMessage('Invalid record ID')
];

// ── Payments ────────────────────────────────────────────────────────
const markPaidValidation = [
  param('id').isInt().withMessage('Invalid record ID'),
  body('paymentMethod').optional().isIn(['BANK', 'CASH', 'UPI']).withMessage('Invalid payment method'),
  body('paymentDate').optional().isISO8601().withMessage('Invalid date'),
  body('transactionRef').optional({ nullable: true }).trim()
];

const bulkPayValidation = [
  param('id').isInt().withMessage('Invalid run ID'),
  body('paymentMethod').optional().isIn(['BANK', 'CASH', 'UPI']),
  body('paymentDate').optional().isISO8601(),
  body('transactionRef').optional({ nullable: true }).trim()
];

// ── Reports ─────────────────────────────────────────────────────────
const reportQueryValidation = [
  query('month').isInt({ min: 1, max: 12 }).withMessage('Valid month required'),
  query('year').isInt({ min: 2020, max: 2100 }).withMessage('Valid year required')
];

module.exports = {
  createEmployeeValidation,
  updateEmployeeValidation,
  employeeIdParam,
  createSalaryStructureValidation,
  updateSalaryStructureValidation,
  structureIdParam,
  markAttendanceValidation,
  bulkAttendanceValidation,
  dateParam,
  attendanceQueryValidation,
  generatePayrollValidation,
  payrollRunIdParam,
  recordIdParam,
  markPaidValidation,
  bulkPayValidation,
  reportQueryValidation
};
