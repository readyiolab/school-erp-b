const { query, queryAll, insert, update } = require('../../../utils/mysql');
const ApiError = require('../../../utils/apiError');

/**
 * Get all teachers in the school
 */
exports.getTeachers = async (req, res, next) => {
  try {
    const schoolId = req.schoolId;
    const teachers = await queryAll(
      `SELECT 
        t.id as teacher_id,
        t.employee_uid,
        a.full_name,
        a.email,
        t.qualifications
      FROM tbl_teachers t
      JOIN tbl_admins a ON t.admin_id = a.id
      WHERE t.school_id = ? AND a.role = 'TEACHER' AND a.is_active = 1`,
      [schoolId]
    );
    res.json({ success: true, data: teachers, teachers });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign a class teacher to a section
 */
exports.assignClassTeacher = async (req, res, next) => {
  try {
    const { section_id, teacher_id } = req.body;
    const schoolId = req.schoolId;

    if (!section_id || !teacher_id) {
      return next(new ApiError(400, 'section_id and teacher_id are required.'));
    }

    // Verify section belongs to school
    const section = await query('SELECT id FROM tbl_sections WHERE id = ? AND school_id = ?', [section_id, schoolId]);
    if (!section) {
      return next(new ApiError(404, 'Section not found.'));
    }

    // Verify teacher belongs to school
    const teacher = await query('SELECT id FROM tbl_teachers WHERE id = ? AND school_id = ?', [teacher_id, schoolId]);
    if (!teacher) {
      return next(new ApiError(404, 'Teacher not found.'));
    }

    // Upsert logic: A section can have only ONE class teacher
    const existing = await query('SELECT id FROM tbl_class_teachers WHERE section_id = ?', [section_id]);
    
    if (existing) {
      await query('UPDATE tbl_class_teachers SET teacher_id = ? WHERE section_id = ?', [teacher_id, section_id]);
    } else {
      await insert('tbl_class_teachers', { section_id, teacher_id });
    }

    res.json({ success: true, data: { message: 'Class teacher assigned successfully' }, message: 'Class teacher assigned successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all class teacher assignments
 */
exports.getClassTeachers = async (req, res, next) => {
  try {
    const schoolId = req.schoolId;
    const assignments = await queryAll(
      `SELECT 
        ct.id,
        s.id as section_id,
        s.name as section_name,
        c.name as class_name,
        a.full_name as teacher_name,
        t.employee_uid
      FROM tbl_class_teachers ct
      JOIN tbl_sections s ON ct.section_id = s.id
      JOIN tbl_classes c ON s.class_id = c.id
      JOIN tbl_teachers t ON ct.teacher_id = t.id
      JOIN tbl_admins a ON t.admin_id = a.id
      WHERE s.school_id = ?`,
      [schoolId]
    );
    res.json({ success: true, data: assignments, classTeachers: assignments });
  } catch (error) {
    next(error);
  }
};
