const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/apiResponse');
const receiptService = require('./service');

const generateReceipt = asyncHandler(async (req, res) => {
  const receipt = await receiptService.generateReceiptForFee(req.schoolId, Number(req.body.feeId));

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Receipt generated successfully',
    data: receipt
  });
});

const getReceiptById = asyncHandler(async (req, res) => {
  const receipt = await receiptService.getReceiptById(req.schoolId, Number(req.params.id));

  return sendSuccess(res, {
    message: 'Receipt fetched successfully',
    data: receipt
  });
});

const downloadReceiptPdf = asyncHandler(async (req, res) => {
  const receiptId = Number(req.params.id);
  const { buffer, receiptNumber } = await receiptService.buildReceiptPdfBuffer(req.schoolId, receiptId);

  res.setHeader('Content-Type', 'application/pdf');
  // Inline is friendlier for ERP users, but still allows download from the browser UI.
  res.setHeader('Content-Disposition', `inline; filename="${receiptNumber}.pdf"`);
  return res.status(200).send(buffer);
});

module.exports = {
  generateReceipt,
  getReceiptById,
  downloadReceiptPdf
};
