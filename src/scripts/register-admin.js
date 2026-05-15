require('../config/dotenv');

const { registerAdmin } = require('../modules/auth/service');
const { disconnect } = require('../utils/mysql');

const readArg = (name) => {
  const inlinePrefix = `--${name}=`;
  const kebabName = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  const inlineKebabPrefix = `--${kebabName}=`;

  for (let i = 0; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (arg.startsWith(inlinePrefix)) return arg.slice(inlinePrefix.length);
    if (arg.startsWith(inlineKebabPrefix)) return arg.slice(inlineKebabPrefix.length);
    if (arg === `--${name}` || arg === `--${kebabName}`) {
      return process.argv[i + 1] || '';
    }
  }

  // npm sometimes treats unknown flags as npm configs on Windows.
  const npmConfigValue = process.env[`npm_config_${name.toLowerCase()}`];
  if (npmConfigValue) return npmConfigValue;

  const npmConfigKebabValue = process.env[`npm_config_${kebabName.replace(/-/g, '_')}`];
  if (npmConfigKebabValue) return npmConfigKebabValue;

  return '';
};

const payload = {
  fullName: readArg('fullName') || process.env.ADMIN_FULL_NAME || '',
  email: readArg('email') || process.env.ADMIN_EMAIL || '',
  password: readArg('password') || process.env.ADMIN_PASSWORD || '',
  schoolCode: readArg('schoolCode') || process.env.SCHOOL_CODE || ''
};

const isValidPayload = () =>
  payload.fullName.trim() &&
  payload.email.trim() &&
  payload.password.trim() &&
  payload.schoolCode.trim();

const printUsage = () => {
  console.log('Usage:');
  console.log('  npm run admin:register -- --fullName="Admin User" --email="admin@example.com" --password="Strong@123" --schoolCode="SCHOOL001"');
  console.log('Or set env vars: ADMIN_FULL_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, SCHOOL_CODE');
};

const run = async () => {
  if (!isValidPayload()) {
    console.error('Missing required admin details.');
    printUsage();
    process.exit(1);
  }

  try {
    const admin = await registerAdmin(payload);
    console.log('Admin created successfully:');
    console.log(JSON.stringify(admin, null, 2));
  } catch (error) {
    console.error('Failed to register admin:', error.message || error);
    process.exitCode = 1;
  } finally {
    await disconnect();
  }
};

run();
