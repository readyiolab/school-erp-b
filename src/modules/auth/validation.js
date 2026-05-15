const { body } = require('express-validator');

const registerValidation = [
  body('fullName')
    .notEmpty()
    .withMessage('Full name is required')
    .bail()
    .isLength({ min: 2 })
    .withMessage('Full name must be at least 2 characters'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .bail()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('schoolCode').notEmpty().withMessage('School code is required')
];

const normalizeLoginIdentifier = (value, { req }) => {
  const identifier = String(
    req.body.email ||
      req.body.username ||
      req.body.identifier ||
      value ||
      ''
  ).trim();

  req.body.email = identifier;
  return identifier;
};

const loginValidation = [
  body('email')
    .customSanitizer(normalizeLoginIdentifier)
    .notEmpty()
    .withMessage('Email or username is required')
    .bail()
    .trim(),
  body('password').notEmpty().withMessage('Password is required')
];

module.exports = {
  registerValidation,
  loginValidation
};
