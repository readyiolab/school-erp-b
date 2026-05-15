const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/apiResponse');
const searchService = require('./service');

const searchStudents = asyncHandler(async (req, res) => {
  const result = await searchService.searchStudents(req.schoolId, req.query);
  return sendSuccess(res, { message: 'Search results', data: result });
});

module.exports = { searchStudents };
