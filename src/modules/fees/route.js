const express = require('express');
const controller = require('./controller');
const validationMiddleware = require('../../middleware/validationMiddleware');
const { allowRoles } = require('../../middleware/roleMiddleware');
const {
  payFeeValidation, studentFeeHistoryValidation,
  assignFeesValidation, assignBulkFeesValidation, recordPaymentValidation, recordBulkPaymentValidation, studentIdParam, assignmentIdParam
} = require('./validation');

const router = express.Router();

// Legacy endpoints
router.post('/pay', allowRoles('ADMIN', 'STAFF'), payFeeValidation, validationMiddleware, controller.payFee);
router.get('/student/:id', allowRoles('ADMIN', 'STAFF'), studentFeeHistoryValidation, validationMiddleware, controller.getStudentFeeHistory);
router.get('/pending', allowRoles('ADMIN', 'STAFF'), controller.getPendingFees);

// New fee system
router.post('/assign', allowRoles('ADMIN', 'STAFF'), assignFeesValidation, validationMiddleware, controller.assignFees);
router.post('/assign-bulk', allowRoles('ADMIN', 'STAFF'), assignBulkFeesValidation, validationMiddleware, controller.assignBulkFees);
router.post('/record-payment', allowRoles('ADMIN', 'STAFF'), recordPaymentValidation, validationMiddleware, controller.recordPayment);
router.post('/record-bulk-payment', allowRoles('ADMIN', 'STAFF'), recordBulkPaymentValidation, validationMiddleware, controller.recordBulkPayment);
router.get('/ledger/student/:studentId', allowRoles('ADMIN', 'STAFF'), studentIdParam, validationMiddleware, controller.getStudentLedger);
router.get('/assignments/student/:studentId', allowRoles('ADMIN', 'STAFF'), studentIdParam, validationMiddleware, controller.getStudentAssignments);
router.get('/assignments/:assignmentId/payments', allowRoles('ADMIN', 'STAFF'), assignmentIdParam, validationMiddleware, controller.getAssignmentPayments);
router.get('/assignments/pending', allowRoles('ADMIN', 'STAFF'), controller.getPendingAssignments);

module.exports = router;
