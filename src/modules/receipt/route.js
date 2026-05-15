const express = require('express');
const controller = require('./controller');
const validationMiddleware = require('../../middleware/validationMiddleware');
const { generateReceiptValidation, receiptIdValidation } = require('./validation');

const router = express.Router();

router.post('/generate', generateReceiptValidation, validationMiddleware, controller.generateReceipt);
router.get('/:id', receiptIdValidation, validationMiddleware, controller.getReceiptById);
router.get('/:id/pdf', receiptIdValidation, validationMiddleware, controller.downloadReceiptPdf);

module.exports = router;
