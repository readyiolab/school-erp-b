const morgan = require('morgan');
const { createLogger, format, transports } = require('winston');
const { nodeEnv } = require('./dotenv');

const logger = createLogger({
  level: nodeEnv === 'production' ? 'info' : 'debug',
  format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
  defaultMeta: { service: 'school-erp-backend' },
  transports: [new transports.Console()]
});

const morganStream = {
  write(message) {
    logger.info(message.trim());
  }
};

const requestLogger = morgan(
  nodeEnv === 'production'
    ? ':remote-addr :method :url :status :response-time ms'
    : 'dev',
  { stream: morganStream }
);

module.exports = {
  logger,
  requestLogger
};
