const { body, param } = require('express-validator');

const createValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('feeType').isIn(['ADMISSION', 'TUITION', 'TRANSPORT', 'EXAM', 'OTHER']).withMessage('Invalid fee type'),
  body('frequency').isIn(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'YEARLY']).withMessage('Invalid frequency'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be positive'),
  body('finePerDay').optional().isFloat({ min: 0 }).withMessage('Fine per day must be >= 0'),
  body('gracePeriodDays').optional().isInt({ min: 0 }).withMessage('Grace period must be >= 0'),
  body('applicableClasses').optional().isArray().withMessage('Applicable classes must be an array'),
  body('items').optional().isArray().withMessage('Items must be an array'),
  body('items.*.name').optional().trim().notEmpty().withMessage('Item name is required'),
  body('items.*.amount').optional().isFloat({ gt: 0 }).withMessage('Item amount must be positive'),
  body('items.*.sortOrder').optional().isInt({ min: 0 }).withMessage('Sort order must be >= 0')
];

const updateValidation = [
  param('id').isInt({ gt: 0 }).withMessage('ID is required'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('feeType').optional().isIn(['ADMISSION', 'TUITION', 'TRANSPORT', 'EXAM', 'OTHER']),
  body('frequency').optional().isIn(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  body('amount').optional().isFloat({ gt: 0 }),
  body('finePerDay').optional().isFloat({ min: 0 }),
  body('gracePeriodDays').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean(),
  body('items').optional().isArray(),
  body('items.*.name').optional().trim().notEmpty(),
  body('items.*.amount').optional().isFloat({ gt: 0 }),
  body('items.*.sortOrder').optional().isInt({ min: 0 })
];

const idValidation = [
  param('id').isInt({ gt: 0 }).withMessage('ID is required')
];

module.exports = { createValidation, updateValidation, idValidation };
