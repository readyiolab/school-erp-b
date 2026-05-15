const asyncHandler = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/apiResponse');
const schoolService = require('./service');
const { logAction } = require('../audit/service');

const setupSchool = asyncHandler(async (req, res) => {
  const result = await schoolService.setupSchool(req.schoolId, req.body);
  await logAction(req.schoolId, req.adminId, 'SCHOOL_SETUP', 'SCHOOL', req.schoolId, {}, req.ip);
  return sendSuccess(res, { statusCode: 201, message: 'School setup completed', data: result });
});

const getClasses = asyncHandler(async (req, res) => {
  const classes = await schoolService.getClasses(req.schoolId);
  return sendSuccess(res, { message: 'Classes fetched', data: classes });
});

const getSectionsByClass = asyncHandler(async (req, res) => {
  const sections = await schoolService.getSectionsByClass(req.schoolId, Number(req.params.classId));
  return sendSuccess(res, { message: 'Sections fetched', data: sections });
});

const getAllSections = asyncHandler(async (req, res) => {
  const sections = await schoolService.getAllSections(req.schoolId);
  return sendSuccess(res, { message: 'All sections fetched', data: sections });
});

const createSection = asyncHandler(async (req, res) => {
  const sections = await schoolService.createSection(req.schoolId, req.body);
  await logAction(req.schoolId, req.adminId, 'SECTION_CREATED', 'SECTION', null, { name: req.body.name, classId: req.body.classId }, req.ip);
  return sendSuccess(res, { statusCode: 201, message: 'Section created', data: sections });
});

const updateSection = asyncHandler(async (req, res) => {
  const section = await schoolService.updateSection(req.schoolId, Number(req.params.id), req.body);
  await logAction(req.schoolId, req.adminId, 'SECTION_UPDATED', 'SECTION', req.params.id, req.body, req.ip);
  return sendSuccess(res, { message: 'Section updated', data: section });
});

const deleteSection = asyncHandler(async (req, res) => {
  await schoolService.deleteSection(req.schoolId, Number(req.params.id));
  await logAction(req.schoolId, req.adminId, 'SECTION_DELETED', 'SECTION', req.params.id, {}, req.ip);
  return sendSuccess(res, { message: 'Section deleted', data: null });
});

const getStreamsByClass = asyncHandler(async (req, res) => {
  const streams = await schoolService.getStreamsByClass(req.schoolId, Number(req.params.classId));
  return sendSuccess(res, { message: 'Streams fetched', data: streams });
});

const getSectionCapacity = asyncHandler(async (req, res) => {
  const capacity = await schoolService.checkSectionCapacity(req.schoolId, req.params.className, req.params.sectionName);
  return sendSuccess(res, { message: 'Capacity fetched', data: capacity });
});

module.exports = {
  setupSchool, getClasses, getSectionsByClass, getAllSections,
  createSection, updateSection, deleteSection, getStreamsByClass, getSectionCapacity
};
