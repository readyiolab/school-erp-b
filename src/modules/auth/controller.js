const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/apiResponse');
const authService = require('./service');

const register = asyncHandler(async (req, res) => {
  const result = await authService.registerAdmin(req.body);

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Admin registered successfully',
    data: result
  });
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.loginAdmin(req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Login successful',
    data: result
  });
});

module.exports = {
  register,
  login
};
