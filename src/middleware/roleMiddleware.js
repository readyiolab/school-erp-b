const ApiError = require('../utils/apiError');

const allowRoles = (...allowedRoles) => (req, res, next) => {
  const currentRole = req.user?.role || req.role;

  if (!currentRole) {
    return next(new ApiError(401, 'User role missing from token'));
  }

  if (!allowedRoles.includes(currentRole)) {
    return next(new ApiError(403, 'You are not allowed to perform this action'));
  }

  return next();
};

module.exports = {
  allowRoles
};
