const { logger } = require('../config/logger');

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  logger.error({
    message: error.message,
    stack: error.stack,
    path: req.originalUrl,
    method: req.method
  });

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    errors: error.details ? [{ message: error.details }] : undefined
  });
};

module.exports = errorHandler;
