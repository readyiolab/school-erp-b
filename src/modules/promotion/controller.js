const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/apiResponse');
const promotionService = require('./service');
const { logAction } = require('../audit/service');

const preview = asyncHandler(async (req, res) => {
  const result = await promotionService.previewPromotion(req.schoolId, req.query);
  return sendSuccess(res, { message: 'Promotion preview', data: result });
});

const promote = asyncHandler(async (req, res) => {
  const result = await promotionService.promoteStudents(req.schoolId, req.body, req.adminId);

  await logAction(req.schoolId, req.adminId, 'STUDENTS_PROMOTED', 'PROMOTION', null, {
    count: result.promoted,
    class: req.body.class || 'ALL'
  }, req.ip);

  return sendSuccess(res, { message: `${result.promoted} students promoted`, data: result });
});

const history = asyncHandler(async (req, res) => {
  const result = await promotionService.getPromotionHistory(req.schoolId, req.query);
  return sendSuccess(res, { message: 'Promotion history', data: result });
});

module.exports = { preview, promote, history };
