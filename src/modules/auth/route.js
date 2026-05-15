const express = require('express');
const controller = require('./controller');
const { loginValidation, registerValidation } = require('./validation');
const validationMiddleware = require('../../middleware/validationMiddleware');
const { authRateLimiter } = require('../../middleware/rateLimiterMiddleware');

const router = express.Router();

router.post('/register', authRateLimiter, registerValidation, validationMiddleware, controller.register);
router.post('/login', authRateLimiter, loginValidation, validationMiddleware, controller.login);

module.exports = router;
