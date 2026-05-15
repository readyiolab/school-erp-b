const dotenv = require('dotenv');

dotenv.config();

const splitOrigins = (value) => {
  const origins = value
    ? value
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
    : ['*'];
  console.log('CORS Origins Parsed:', origins);
  return origins;
};

console.log('Raw CORS_ORIGIN from process.env:', process.env.CORS_ORIGIN);

console.log('Environment Config Loaded:', {
  nodeEnv: process.env.NODE_ENV,
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ? 'Present' : 'Missing'
});

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  appName: process.env.APP_NAME || 'School ERP',
  dbUrl: process.env.DATABASE_URL,
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: Number(process.env.DB_PORT) || 3306,
  dbName: process.env.DB_NAME || 'school_erp',
  dbUser: process.env.DB_USER || 'root',
  dbPass: process.env.DB_PASS || '',
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  corsOrigins: splitOrigins(process.env.CORS_ORIGIN),
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  puppeteerExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH || ''
};
