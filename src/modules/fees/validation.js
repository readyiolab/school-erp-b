const { body, param } = require('express-validator');

const payFeeValidation = [
  body('studentId').isInt({ gt: 0 }).withMessage('Student id must be a positive integer'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
  body('paymentDate').optional().isISO8601().withMessage('Payment date must be a valid ISO date')
];

const studentFeeHistoryValidation = [
  param('id').isInt({ gt: 0 }).withMessage('Student id must be a positive integer')
];

const assignFeesValidation = [
  body('studentId').isInt({ gt: 0 }).withMessage('Student ID is required'),
  body('feeStructureId').isInt({ gt: 0 }).withMessage('Fee structure ID is required'),
  body('dueDate').optional().isISO8601().withMessage('Due date must be valid ISO date'),
  body('discountAmount').optional().isFloat({ min: 0 }).withMessage('Discount must be >= 0'),
  body('discountReason').optional().trim(),
  body('installmentCount').optional().isInt({ min: 1, max: 12 }).withMessage('Installments must be 1-12'),
  body('academicYear').optional().trim(),
  body('lineItems').optional().isArray().withMessage('Line items must be an array'),
  body('lineItems.*.name').optional().trim().notEmpty().withMessage('Line item name is required'),
  body('lineItems.*.amount').optional().isFloat({ gt: 0 }).withMessage('Line item amount must be positive'),
  body('lineItems.*.discountAmount').optional().isFloat({ min: 0 }).withMessage('Line item discount must be >= 0')
];

const recordPaymentValidation = [
  body('feeAssignmentId').isInt({ gt: 0 }).withMessage('Fee assignment ID is required'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be positive'),
  body('paymentMode').isIn(['CASH', 'ONLINE', 'UPI']).withMessage('Invalid payment mode'),
  body('transactionRef').optional().trim(),
  body('paymentDate').optional().isISO8601()
];

const recordBulkPaymentValidation = [
  body('payments').isArray({ min: 1 }).withMessage('Payments are required'),
  body('payments.*.feeAssignmentId').isInt({ gt: 0 }).withMessage('Fee assignment ID is required'),
  body('payments.*.amount').isFloat({ gt: 0 }).withMessage('Amount must be positive'),
  body('paymentMode').isIn(['CASH', 'ONLINE', 'UPI']).withMessage('Invalid payment mode'),
  body('transactionRef').optional().trim(),
  body('paymentDate').optional().isISO8601()
];

const studentIdParam = [
  param('studentId').isInt({ gt: 0 }).withMessage('Student ID is required')
];

const assignmentIdParam = [
  param('assignmentId').isInt({ gt: 0 }).withMessage('Assignment ID is required')
];

const assignBulkFeesValidation = [
  body('feeStructureId').isInt({ gt: 0 }).withMessage('Fee structure ID is required'),
  body('class').notEmpty().withMessage('Class name is required'),
  body('studentIds').optional().isArray().withMessage('Student IDs must be an array'),
  body('dueDate').optional().isISO8601().withMessage('Due date must be valid ISO date'),
  body('academicYear').optional().trim()
];

module.exports = {
  payFeeValidation, studentFeeHistoryValidation,
  assignFeesValidation, recordPaymentValidation, recordBulkPaymentValidation, studentIdParam, assignmentIdParam,
  assignBulkFeesValidation
};
