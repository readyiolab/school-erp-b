const { body, param } = require('express-validator');

const setupSchoolValidation = [
  body('defaultCapacity').optional().isInt({ min: 1, max: 200 }).withMessage('Capacity must be 1-200')
];

const createSectionValidation = [
  body('classId').isInt({ gt: 0 }).withMessage('Class ID is required'),
  body('name').trim().notEmpty().withMessage('Section name is required'),
  body('maxCapacity').optional().isInt({ min: 1, max: 200 }).withMessage('Capacity must be 1-200')
];

const updateSectionValidation = [
  param('id').isInt({ gt: 0 }).withMessage('Section ID is required'),
  body('name').optional().trim().notEmpty().withMessage('Section name cannot be empty'),
  body('maxCapacity').optional().isInt({ min: 1, max: 200 }).withMessage('Capacity must be 1-200')
];

const classIdValidation = [
  param('classId').isInt({ gt: 0 }).withMessage('Class ID is required')
];

const sectionIdValidation = [
  param('id').isInt({ gt: 0 }).withMessage('Section ID is required')
];

module.exports = {
  setupSchoolValidation, createSectionValidation, updateSectionValidation,
  classIdValidation, sectionIdValidation
};
