const schoolService = require('../../school/service');

/**
 * Get all classes for the current school
 */
exports.getClasses = async (req, res, next) => {
  try {
    const schoolId = req.schoolId;
    const classes = await schoolService.getClasses(schoolId);
    res.json({ success: true, data: classes, classes });
  } catch (error) {
    next(error);
  }
};

/**
 * Get sections for a specific class
 */
exports.getSections = async (req, res, next) => {
  try {
    const schoolId = req.schoolId;
    const { classId } = req.params;
    const sections = await schoolService.getSectionsByClass(schoolId, Number(classId));
    res.json({ success: true, data: sections, sections });
  } catch (error) {
    next(error);
  }
};
