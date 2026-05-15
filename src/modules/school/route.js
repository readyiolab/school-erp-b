const express = require('express');
const controller = require('./controller');
const validationMiddleware = require('../../middleware/validationMiddleware');
const {
  setupSchoolValidation, createSectionValidation, updateSectionValidation,
  classIdValidation, sectionIdValidation
} = require('./validation');

const router = express.Router();

router.post('/setup', setupSchoolValidation, validationMiddleware, controller.setupSchool);
router.get('/classes', controller.getClasses);
router.get('/classes/:classId/sections', classIdValidation, validationMiddleware, controller.getSectionsByClass);
router.get('/classes/:classId/streams', classIdValidation, validationMiddleware, controller.getStreamsByClass);
router.get('/sections', controller.getAllSections);
router.post('/sections', createSectionValidation, validationMiddleware, controller.createSection);
router.put('/sections/:id', updateSectionValidation, validationMiddleware, controller.updateSection);
router.delete('/sections/:id', sectionIdValidation, validationMiddleware, controller.deleteSection);
router.get('/capacity/:className/:sectionName', controller.getSectionCapacity);

module.exports = router;
