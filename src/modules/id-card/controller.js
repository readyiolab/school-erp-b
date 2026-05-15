const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/apiResponse');
const idCardService = require('./service');

const generate = asyncHandler(async (req, res) => {
  const result = await idCardService.generateIdCard(req.schoolId, Number(req.params.studentId));
  return sendSuccess(res, { statusCode: 201, message: 'ID card generated', data: result });
});

const bulkGenerate = asyncHandler(async (req, res) => {
  const result = await idCardService.bulkGenerateIdCards(req.schoolId, req.body);
  return sendSuccess(res, { message: 'Bulk ID card generation complete', data: result });
});

const getByStudent = asyncHandler(async (req, res) => {
  const result = await idCardService.getIdCardByStudent(req.schoolId, Number(req.params.studentId));
  return sendSuccess(res, { message: 'ID card fetched', data: result });
});

module.exports = { generate, bulkGenerate, getByStudent };
