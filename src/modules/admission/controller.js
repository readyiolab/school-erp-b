const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/apiResponse');
const admissionService = require('./service');
const { logAction } = require('../audit/service');

const createAdmission = asyncHandler(async (req, res) => {
  const admission = await admissionService.createAdmission(req.schoolId, req.body, req.files);
  
  // Optional: Log action
  await logAction(req.schoolId, null, 'ADMISSION_APPLIED', 'ADMISSION', admission.id, { 
    studentName: admission.studentName,
    class: admission.class
  });

  return sendSuccess(res, { 
    statusCode: 201, 
    message: 'Admission application submitted successfully', 
    data: admission 
  });
});

const getAdmissions = asyncHandler(async (req, res) => {
  const admissions = await admissionService.getAdmissions(req.schoolId, req.query);
  return sendSuccess(res, { message: 'Admissions fetched successfully', data: admissions });
});

const approveAdmission = asyncHandler(async (req, res) => {
  const result = await admissionService.approveAdmission(
    req.schoolId,
    Number(req.params.id),
    req.adminId,
    req.body
  );
  
  await logAction(req.schoolId, req.adminId, 'ADMISSION_APPROVED', 'ADMISSION', req.params.id, {
    studentUid: result.student.studentUid,
    studentName: result.student.name,
    feeStructureId: req.body?.feeStructureId || null,
    collectedAtApproval: Boolean(result.payment)
  }, req.ip);

  return sendSuccess(res, { message: 'Admission approved and student created', data: result });
});

module.exports = {
  createAdmission,
  getAdmissions,
  approveAdmission
};
