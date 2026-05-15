const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/apiResponse');
const feeStructureService = require('./service');
const { logAction } = require('../audit/service');

const create = asyncHandler(async (req, res) => {
  const result = await feeStructureService.createFeeStructure(req.schoolId, req.body);
  await logAction(req.schoolId, req.adminId, 'FEE_STRUCTURE_CREATED', 'FEE_STRUCTURE', result.id, { name: result.name }, req.ip);
  return sendSuccess(res, { statusCode: 201, message: 'Fee structure created', data: result });
});

const list = asyncHandler(async (req, res) => {
  const result = await feeStructureService.getFeeStructures(req.schoolId, req.query);
  return sendSuccess(res, { message: 'Fee structures fetched', data: result });
});

const getById = asyncHandler(async (req, res) => {
  const result = await feeStructureService.getFeeStructureById(req.schoolId, Number(req.params.id));
  return sendSuccess(res, { message: 'Fee structure fetched', data: result });
});

const updateOne = asyncHandler(async (req, res) => {
  const result = await feeStructureService.updateFeeStructure(req.schoolId, Number(req.params.id), req.body);
  await logAction(req.schoolId, req.adminId, 'FEE_STRUCTURE_UPDATED', 'FEE_STRUCTURE', req.params.id, req.body, req.ip);
  return sendSuccess(res, { message: 'Fee structure updated', data: result });
});

const deleteOne = asyncHandler(async (req, res) => {
  await feeStructureService.deleteFeeStructure(req.schoolId, Number(req.params.id));
  await logAction(req.schoolId, req.adminId, 'FEE_STRUCTURE_DELETED', 'FEE_STRUCTURE', req.params.id, {}, req.ip);
  return sendSuccess(res, { message: 'Fee structure deleted', data: null });
});

module.exports = { create, list, getById, updateOne, deleteOne };
