const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/apiResponse');
const feeService = require('./service');
const { logAction } = require('../audit/service');

const payFee = asyncHandler(async (req, res) => {
  const result = await feeService.payFee(req.schoolId, req.body);
  await logAction(
    req.schoolId,
    req.adminId,
    'FEE_PAID',
    'FEE',
    result?.fee?.id || null,
    { studentId: req.body.studentId, amount: req.body.amount },
    req.ip
  );
  return sendSuccess(res, { statusCode: 201, message: 'Fee paid successfully', data: result });
});

const getStudentFeeHistory = asyncHandler(async (req, res) => {
  const history = await feeService.getStudentFeeHistory(req.schoolId, Number(req.params.id));
  return sendSuccess(res, { message: 'Student fee history fetched', data: history });
});

const getPendingFees = asyncHandler(async (req, res) => {
  const fees = await feeService.getPendingFees(req.schoolId);
  return sendSuccess(res, { message: 'Pending fees fetched', data: fees });
});

// ── New fee system endpoints ────────────────────────────────────────
const assignFees = asyncHandler(async (req, res) => {
  const result = await feeService.assignFeesToStudent(req.schoolId, req.body);
  await logAction(req.schoolId, req.adminId, 'FEES_ASSIGNED', 'FEE_ASSIGNMENT', null, { studentId: req.body.studentId, feeStructureId: req.body.feeStructureId }, req.ip);
  return sendSuccess(res, { statusCode: 201, message: 'Fees assigned', data: result });
});

const recordPayment = asyncHandler(async (req, res) => {
  const result = await feeService.recordPayment(req.schoolId, req.body);
  await logAction(
    req.schoolId,
    req.adminId,
    'FEE_PAYMENT_RECORDED',
    'FEE_PAYMENT',
    result?.id || null,
    { feeAssignmentId: req.body.feeAssignmentId, amount: req.body.amount },
    req.ip
  );
  return sendSuccess(res, { statusCode: 201, message: 'Payment recorded', data: result });
});

const recordBulkPayment = asyncHandler(async (req, res) => {
  const result = await feeService.recordBulkPayment(req.schoolId, req.body);
  await logAction(
    req.schoolId,
    req.adminId,
    'FEE_BULK_PAYMENT_RECORDED',
    'RECEIPT',
    result?.receipt?.id || null,
    { payments: req.body.payments?.length || 0 },
    req.ip
  );
  return sendSuccess(res, { statusCode: 201, message: 'Bulk payment recorded', data: result });
});

const getStudentAssignments = asyncHandler(async (req, res) => {
  const result = await feeService.getStudentFeeAssignments(req.schoolId, Number(req.params.studentId));
  return sendSuccess(res, { message: 'Fee assignments fetched', data: result });
});

const getStudentLedger = asyncHandler(async (req, res) => {
  const result = await feeService.getStudentLedger(req.schoolId, Number(req.params.studentId));
  return sendSuccess(res, { message: 'Student fee ledger fetched', data: result });
});

const getAssignmentPayments = asyncHandler(async (req, res) => {
  const result = await feeService.getPaymentsByAssignment(req.schoolId, Number(req.params.assignmentId));
  return sendSuccess(res, { message: 'Payments fetched', data: result });
});

const getPendingAssignments = asyncHandler(async (req, res) => {
  const result = await feeService.getPendingAssignments(req.schoolId);
  return sendSuccess(res, { message: 'Pending assignments fetched', data: result });
});

const assignBulkFees = asyncHandler(async (req, res) => {
  const result = await feeService.assignFeesBulkByClass(req.schoolId, req.body);
  await logAction(
    req.schoolId, 
    req.adminId, 
    'FEES_BULK_ASSIGNED', 
    'FEE_ASSIGNMENT', 
    null, 
    { class: req.body.class, feeStructureId: req.body.feeStructureId, total: result.total }, 
    req.ip
  );
  return sendSuccess(res, { statusCode: 201, message: 'Bulk fee assignment task completed', data: result });
});

module.exports = {
  payFee, getStudentFeeHistory, getPendingFees,
  assignFees, recordPayment, recordBulkPayment, getStudentAssignments, getStudentLedger, getAssignmentPayments, getPendingAssignments,
  assignBulkFees
};
