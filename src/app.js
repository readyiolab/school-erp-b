const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
require('./config/dotenv');

const corsOptions = require('./config/cors');
const { logger, requestLogger } = require('./config/logger');
const { port, nodeEnv } = require('./config/dotenv');
const { apiRateLimiter } = require('./middleware/rateLimiterMiddleware');
const sanitizeMiddleware = require('./middleware/sanitizeMiddleware');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes');
const { isHealthy, disconnect } = require('./utils/mysql');

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors(corsOptions));
app.use(requestLogger);
app.use(apiRateLimiter);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeMiddleware);

app.get('/health', async (req, res, next) => {
  try {
    const healthy = await isHealthy();

    return res.status(healthy ? 200 : 503).json({
      success: healthy,
      message: healthy ? 'Service healthy' : 'Database unhealthy',
      data: {
        environment: nodeEnv
      }
    });
  } catch (error) {
    return next(error);
  }
});

app.use('/api', apiRoutes);
app.use(errorHandler);

const startServer = async () => {
  try {
    app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
    });
  } catch (error) {
    logger.error({
      message: 'Unable to start server',
      stack: error.stack
    });
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  await disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnect();
  process.exit(0);
});

module.exports = {
  app,
  startServer
};
