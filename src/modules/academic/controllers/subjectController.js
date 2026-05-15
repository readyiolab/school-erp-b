const { query, queryAll, insert, update, deleteRow } = require('../../../utils/mysql');
const asyncHandler = require('../../../utils/asyncHandler');
const { sendSuccess } = require('../../../utils/apiResponse');
const ApiError = require('../../../utils/apiError');

const getSubjects = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId;
  const subjects = await queryAll('SELECT * FROM tbl_subjects WHERE school_id = ?', [schoolId]);
  return sendSuccess(res, { message: 'Subjects fetched', data: subjects });
});

const addSubject = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId;
  const { name, code, is_practical } = req.body;

  if (!name || !code) {
    throw new ApiError(400, 'Subject name and code are required');
  }

  // Check if subject code already exists in this school
  const existing = await query('SELECT id FROM tbl_subjects WHERE school_id = ? AND code = ?', [schoolId, code]);
  if (existing) {
    throw new ApiError(409, 'Subject with this code already exists');
  }

  const result = await insert('tbl_subjects', {
    school_id: schoolId,
    name,
    code,
    is_practical: is_practical ? 1 : 0
  });

  return sendSuccess(res, { statusCode: 201, message: 'Subject added successfully', data: { id: result.insert_id } });
});

const updateSubject = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId;
  const subjectId = req.params.id;
  const { name, code, is_practical } = req.body;

  const result = await update('tbl_subjects', {
    name,
    code,
    is_practical: is_practical ? 1 : 0
  }, 'id = ? AND school_id = ?', [subjectId, schoolId]);

  if (result.affectedRows === 0) {
    throw new ApiError(404, 'Subject not found or unauthorized');
  }

  return sendSuccess(res, { message: 'Subject updated successfully' });
});

const deleteSubject = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId;
  const subjectId = req.params.id;

  // Check if subject is assigned to any classes or teachers
  const assigned = await query('SELECT id FROM tbl_teacher_assignments WHERE subject_id = ? LIMIT 1', [subjectId]);
  if (assigned) {
    throw new ApiError(400, 'Cannot delete subject as it is assigned to teachers');
  }

  const result = await deleteRow('tbl_subjects', 'id = ? AND school_id = ?', [subjectId, schoolId]);
  if (result.affectedRows === 0) {
    throw new ApiError(404, 'Subject not found or unauthorized');
  }

  return sendSuccess(res, { message: 'Subject deleted successfully' });
});

const getClassSubjects = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const subjects = await queryAll(
    `SELECT cs.id, s.name as name, s.code as code, 
            cs.theory_max_marks, cs.practical_max_marks
     FROM tbl_class_subjects cs
     JOIN tbl_subjects s ON cs.subject_id = s.id
     WHERE cs.class_id = ?`,
    [classId]
  );
  return sendSuccess(res, { message: 'Class subjects fetched', data: subjects });
});

const saveClassSubjects = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const schoolId = req.schoolId;
  const { subjects } = req.body; 

  // Simple approach: Delete existing mapping for this class
  await query('DELETE FROM tbl_class_subjects WHERE class_id = ?', [classId]);

  if (subjects && subjects.length > 0) {
    for (const sub of subjects) {
      if (!sub.name || !sub.code) continue;
      
      // Determine if practical based on marks
      const isPractical = Number(sub.practical_max_marks) > 0 ? 1 : 0;

      // Find or create the subject in global master
      let subjectId;
      const existing = await query('SELECT id FROM tbl_subjects WHERE school_id = ? AND code = ? LIMIT 1', [schoolId, sub.code]);
      if (existing) {
        subjectId = existing.id;
        // Optionally update the subject name / is_practical if it changed
        await update('tbl_subjects', { name: sub.name, is_practical: isPractical }, 'id = ?', [subjectId]);
      } else {
        const result = await insert('tbl_subjects', {
          school_id: schoolId,
          name: sub.name,
          code: sub.code,
          is_practical: isPractical
        });
        subjectId = result.insert_id;
      }

      await insert('tbl_class_subjects', {
        class_id: classId,
        subject_id: subjectId,
        theory_max_marks: sub.theory_max_marks || 0,
        practical_max_marks: sub.practical_max_marks || 0
      });
    }
  }

  return sendSuccess(res, { message: 'Class subjects updated successfully' });
});

module.exports = {
  getSubjects,
  addSubject,
  updateSubject,
  deleteSubject,
  getClassSubjects,
  saveClassSubjects
};
