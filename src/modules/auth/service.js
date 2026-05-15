const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, insert } = require('../../utils/mysql');
const { jwtExpiresIn, jwtSecret } = require('../../config/dotenv');
const ApiError = require('../../utils/apiError');

const buildBaseUsername = ({ fullName, email }) => {
  const fromName = String(fullName || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');

  if (fromName) {
    return fromName.slice(0, 100);
  }

  const fromEmail = String(email || '')
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^\.+|\.+$/g, '');

  return (fromEmail || `admin${Date.now()}`).slice(0, 100);
};

const generateUniqueUsername = async ({ fullName, email }) => {
  const base = buildBaseUsername({ fullName, email });
  let username = base;
  let counter = 1;

  while (true) {
    const existing = await query('SELECT id FROM tbl_admins WHERE username = ? LIMIT 1', [username]);
    if (!existing) {
      return username;
    }

    const suffix = `.${counter}`;
    const maxBaseLength = 100 - suffix.length;
    username = `${base.slice(0, Math.max(maxBaseLength, 1))}${suffix}`;
    counter += 1;
  }
};

const registerAdmin = async ({ fullName, email, password, schoolCode }) => {
  const normalizedSchoolCode = String(schoolCode || '').trim();

  let school = await query(
    'SELECT id, name FROM tbl_schools WHERE LOWER(code) = LOWER(?) LIMIT 1',
    [normalizedSchoolCode]
  );

  if (!school) {
    const schoolInsert = await insert('tbl_schools', {
      name: `${normalizedSchoolCode} School`,
      code: normalizedSchoolCode
    });
    school = { id: schoolInsert.insert_id, name: `${normalizedSchoolCode} School` };
  }

  const existingAdmin = await query('SELECT id FROM tbl_admins WHERE email = ? LIMIT 1', [email]);

  if (existingAdmin) {
    throw new ApiError(409, 'Admin with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const username = await generateUniqueUsername({ fullName, email });

  const insertResult = await insert('tbl_admins', {
    school_id: school.id,
    email,
    username,
    password_hash: passwordHash,
    full_name: fullName
  });

  return {
    id: insertResult.insert_id,
    fullName,
    email,
    schoolId: school.id,
    schoolName: school.name
  };
};

const loginAdmin = async ({ email, password }) => {
  // email here can be either email or username (for students login with UID)
  console.log('Login Attempt:', { identifier: email });
  const user = await query(
    `SELECT
      a.id,
      a.email,
      a.username,
      a.full_name,
      a.password_hash,
      a.school_id,
      a.role,
      a.profile_id,
      s.name AS school_name,
      s.code AS school_code
    FROM tbl_admins a
    INNER JOIN tbl_schools s ON s.id = a.school_id
    WHERE (a.email = ? OR a.username = ?) AND a.is_active = 1
    LIMIT 1`,
    [email, email]
  );

  if (!user) {
    console.log('Login Failed: User not found or inactive', { identifier: email });
    throw new ApiError(401, 'Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  console.log('Password Validation:', { identifier: email, isPasswordValid });

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      schoolId: user.school_id,
      role: user.role,
      profileId: (user.role === 'STUDENT' || user.role === 'TEACHER') ? user.username : user.profile_id
    },
    jwtSecret,
    {
      expiresIn: jwtExpiresIn
    }
  );

  return {
    token,
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      username: user.username,
      schoolId: user.school_id,
      schoolName: user.school_name,
      schoolCode: user.school_code,
      role: user.role,
      profileId: (user.role === 'STUDENT' || user.role === 'TEACHER') ? user.username : user.profile_id
    }
  };
};

module.exports = {
  registerAdmin,
  loginAdmin
};
