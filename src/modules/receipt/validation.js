const { body, param } = require('express-validator');

const generateReceiptValidation = [
  body('feeId').isInt({ gt: 0 }).withMessage('Fee id must be a positive integer')
];

const receiptIdValidation = [
  param('id').isInt({ gt: 0 }).withMessage('Receipt id must be a positive integer')
];

module.exports = {
  generateReceiptValidation,
  receiptIdValidation
};
