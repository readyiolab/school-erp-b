const asyncHandler = require('../../utils/asyncHandler');
const reportService = require('./service');

const generateReport = asyncHandler(async (req, res) => {
  const reportType = req.params.type;
  const { buffer, contentType, extension, title } = await reportService.generateReport(
    req.schoolId, reportType, req.query
  );

  const safeName = title.replace(/[^a-zA-Z0-9\-_ ]/g, '').replace(/\s+/g, '_');
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.${extension}"`);
  res.send(buffer);
});

module.exports = { generateReport };
