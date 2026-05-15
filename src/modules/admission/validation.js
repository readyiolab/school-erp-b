const { body, param } = require('express-validator');

const createAdmissionValidation = [
  body('studentName').trim().notEmpty().withMessage('Student name is required'),
  body('class').notEmpty().withMessage('Class is required'),
  body('section').optional().trim(),
  body('stream').optional().trim(),
  body('admissionType').optional().isIn(['REGULAR', 'TRANSFER', 'SCHOLARSHIP', 'OTHER']).withMessage('Invalid admission type'),
  body('dateOfBirth').notEmpty().withMessage('Date of birth is required').isISO8601().withMessage('Invalid date of birth'),
  body('gender').notEmpty().withMessage('Gender is required').isIn(['MALE', 'FEMALE', 'OTHER']).withMessage('Invalid gender'),
  body('parentName').trim().notEmpty().withMessage('Parent name is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required').isMobilePhone().withMessage('Invalid phone number'),
  body('email').optional().trim().isEmail().withMessage('Invalid email address'),
  body('aadhaarNumber').optional().trim().custom((value) => {
    if (!value) return true;
    return /^\d{12}$/.test(value);
  }).withMessage('Aadhaar number must be exactly 12 digits'),
  body('address').optional().trim()
];

const admissionStatusValidation = [
  param('id').isInt({ gt: 0 }).withMessage('Admission ID must be a positive integer'),
  body('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED']).withMessage('Invalid status')
];

const admissionIdParam = [
  param('id').isInt({ gt: 0 }).withMessage('Admission ID must be a positive integer')
];

const approveAdmissionValidation = [
  param('id').isInt({ gt: 0 }).withMessage('Admission ID must be a positive integer'),
  body('feeStructureId').optional({ nullable: true }).isInt({ gt: 0 }).withMessage('Fee structure must be a positive integer'),
  body('feeLineItems').optional().isArray().withMessage('Fee line items must be an array'),
  body('feeLineItems.*.name').optional().trim().notEmpty().withMessage('Fee line item name is required'),
  body('feeLineItems.*.amount').optional().isFloat({ gt: 0 }).withMessage('Fee line item amount must be positive'),
  body('feeLineItems.*.discountAmount').optional().isFloat({ min: 0 }).withMessage('Fee line item discount must be >= 0'),
  body('discountAmount').optional().isFloat({ min: 0 }).withMessage('Discount amount must be >= 0'),
  body('discountReason').optional().trim(),
  body('dueDate').optional().isISO8601().withMessage('Due date must be valid'),
  body('installmentCount').optional().isInt({ min: 1, max: 12 }).withMessage('Installments must be between 1 and 12'),
  body('collectPayment').optional().isBoolean().withMessage('Collect payment must be boolean'),
  body('paymentAmount').optional().isFloat({ gt: 0 }).withMessage('Payment amount must be positive'),
  body('paymentMode').optional().isIn(['CASH', 'ONLINE', 'UPI']).withMessage('Invalid payment mode'),
  body('paymentDate').optional().isISO8601().withMessage('Payment date must be valid'),
  body('transactionRef').optional().trim()
];

module.exports = {
  createAdmissionValidation,
  admissionStatusValidation,
  admissionIdParam,
  approveAdmissionValidation
};
