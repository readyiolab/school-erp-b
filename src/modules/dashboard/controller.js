const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/apiResponse');
const dashboardService = require('./service');

const getSummary = asyncHandler(async (req, res) => {
  const data = await dashboardService.getSummary(req.schoolId);
  return sendSuccess(res, { message: 'Dashboard summary', data });
});

const getClassStrength = asyncHandler(async (req, res) => {
  const data = await dashboardService.getClassStrength(req.schoolId);
  return sendSuccess(res, { message: 'Class strength', data });
});

const getSectionOccupancy = asyncHandler(async (req, res) => {
  const data = await dashboardService.getSectionOccupancy(req.schoolId);
  return sendSuccess(res, { message: 'Section occupancy', data });
});

const getRevenueChart = asyncHandler(async (req, res) => {
  const data = await dashboardService.getRevenueChart(req.schoolId, req.query.year ? Number(req.query.year) : undefined);
  return sendSuccess(res, { message: 'Revenue chart', data });
});

module.exports = { getSummary, getClassStrength, getSectionOccupancy, getRevenueChart };
