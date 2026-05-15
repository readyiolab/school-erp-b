const { body, param, query } = require('express-validator');

const phoneRule = /^(?:\+?\d{10,15})$/;

const createStudentValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('class').notEmpty().withMessage('Class is required'),
  body('section').notEmpty().withMessage('Section is required'),
  body('parentName').optional().isString().withMessage('Parent name must be a string'),
  body('phone')
    .optional()
    .matches(phoneRule)
    .withMessage('Phone must be a valid number')
];

const updateStudentValidation = [
  param('id').isInt({ gt: 0 }).withMessage('Student id must be a positive integer'),
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('class').optional().notEmpty().withMessage('Class cannot be empty'),
  body('section').optional().notEmpty().withMessage('Section cannot be empty'),
  body('parentName').optional().isString().withMessage('Parent name must be a string'),
  body('phone')
    .optional()
    .matches(phoneRule)
    .withMessage('Phone must be a valid number')
];

const studentIdValidation = [
  param('id').isInt({ gt: 0 }).withMessage('Student id must be a positive integer')
];

const listStudentsValidation = [
  query('class').optional().notEmpty().withMessage('Class filter cannot be empty'),
  query('section').optional().notEmpty().withMessage('Section filter cannot be empty')
];

module.exports = {
  createStudentValidation,
  updateStudentValidation,
  studentIdValidation,
  listStudentsValidation
};
