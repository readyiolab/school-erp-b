const { corsOrigins } = require('./dotenv');

const allowAll = corsOrigins.includes('*');

const corsOptions = {
  origin(origin, callback) {
    if (allowAll || !origin || corsOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('CORS origin not allowed'));
  },
  credentials: true
};

module.exports = corsOptions;
