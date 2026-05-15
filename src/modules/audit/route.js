const express = require('express');
const router = express.Router();
const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/apiResponse');
const auditService = require('./service');

const getAuditLogs = asyncHandler(async (req, res) => {
  const result = await auditService.getAuditLogs(req.schoolId, req.query);
  return sendSuccess(res, { message: 'Audit logs fetched successfully', data: result });
});

router.get('/', getAuditLogs);

module.exports = router;
