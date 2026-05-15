const express = require('express');
const router = express.Router();
const controller = require('./controller');
const validationMiddleware = require('../../middleware/validationMiddleware');
const { photoUpload } = require('../../middleware/uploadMiddleware');

// Get all students with pagination/filters
router.get('/', controller.getStudents);

// Get student by numeric ID
router.get('/:id(\\d+)', controller.getStudentById);

// Get student by encrypted ID (URL safe)
router.get('/enc/:encryptedId', controller.getStudentByEncryptedId);

// Update student (with optional photo upload)
router.put('/:id', photoUpload, controller.updateStudent);

// Delete student
router.delete('/:id', controller.deleteStudent);

module.exports = router;
