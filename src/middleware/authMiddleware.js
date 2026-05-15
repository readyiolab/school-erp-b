const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/dotenv');
const ApiError = require('../utils/apiError');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Authorization token is required'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = {
      id: payload.userId || payload.adminId, // Support both names
      adminId: payload.userId || payload.adminId, // Backwards compatibility
      email: payload.email,
      schoolId: payload.schoolId,
      role: payload.role,
      profileId: payload.profileId
    };
    req.adminId = payload.adminId || null;
    req.schoolId = payload.schoolId;
    req.role = payload.role;

    req.schoolId = payload.schoolId; // Direct access

    return next();
  } catch (error) {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
};

module.exports = authMiddleware;
