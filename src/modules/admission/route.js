const express = require('express');
const router = express.Router();
const controller = require('./controller');
const validationMiddleware = require('../../middleware/validationMiddleware');
const { admissionUpload } = require('../../middleware/uploadMiddleware');
const { createAdmissionValidation, approveAdmissionValidation } = require('./validation');

// Use multer fields for student's documents
router.post('/', admissionUpload, createAdmissionValidation, validationMiddleware, controller.createAdmission);
router.get('/', controller.getAdmissions);
router.put('/:id/approve', approveAdmissionValidation, validationMiddleware, controller.approveAdmission);

module.exports = router;
