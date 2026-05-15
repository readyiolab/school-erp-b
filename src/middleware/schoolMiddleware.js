const ApiError = require('../utils/apiError');

const schoolMiddleware = (req, res, next) => {
  if (!req.user || !req.user.schoolId) {
    return next(new ApiError(403, 'School context missing from token'));
  }

  req.schoolId = req.user.schoolId;
  req.school = { schoolId: req.user.schoolId };
  return next();
};

module.exports = schoolMiddleware;
