const { body, validationResult } = require('express-validator');

exports.assignTeacherValidation = [
  body('session_id').isInt().withMessage('Valid Session ID required'),
  body('teacher_id').isInt().withMessage('Valid Teacher ID required'),
  body('section_id').isInt().withMessage('Valid Section ID required'),
  body('subject_id').isInt().withMessage('Valid Subject ID required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  }
];

exports.setTimetableValidation = [
  body('section_id').isInt().withMessage('Valid Section ID required'),
  body('teacher_id').isInt().withMessage('Valid Teacher ID required'),
  body('subject_id').isInt().withMessage('Valid Subject ID required'),
  body('day_of_week').isInt({ min: 1, max: 7 }).withMessage('Day of week must be between 1 and 7'),
  body('period').isInt({ min: 1, max: 10 }).withMessage('Period must be between 1 and 10'),
  body('start_time').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Invalid time format (HH:MM)'),
  body('end_time').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Invalid time format (HH:MM)'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  }
];
