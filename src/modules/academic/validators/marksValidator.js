const { body, validationResult } = require('express-validator');

exports.saveMarksValidation = [
  body('session_id').isInt().withMessage('Valid Session ID is required'),
  body('exam_id').isInt().withMessage('Valid Exam ID is required'),
  body('section_id').isInt().withMessage('Valid Section ID is required'),
  body('subject_id').isInt().withMessage('Valid Subject ID is required'),
  body('marks').isArray({ min: 1 }).withMessage('Marks data must be a non-empty array'),
  body('marks.*.student_id').isInt().withMessage('Student ID is required'),
  body('marks.*.theory_marks').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Theory marks must be >= 0'),
  body('marks.*.practical_marks').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Practical marks must be >= 0'),
  body('marks.*.is_absent').optional().isBoolean().withMessage('is_absent flag must be boolean'),
  
  // Middleware to catch validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  }
];
