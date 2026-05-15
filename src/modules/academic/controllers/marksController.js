const { connectDb, query, queryAll } = require('../../../utils/mysql');
const ApiError = require('../../../utils/apiError');

/**
 * Validates if the currently logged in user is actually assigned to teach 
 * the requested subject in the requested section.
 */
const verifyTeacherAssignment = async (profileId, schoolId, sessionId, sectionId, subjectId) => {
  const teacher = await query(`SELECT id FROM tbl_teachers WHERE employee_uid = ? AND school_id = ?`, [profileId, schoolId]);
  if (!teacher) throw new ApiError(403, 'User is not registered as a teacher');

  const assignment = await query(
    `SELECT id FROM tbl_teacher_assignments 
     WHERE session_id = ? AND teacher_id = ? AND section_id = ? AND subject_id = ?`,
    [sessionId, teacher.id, sectionId, subjectId]
  );

  if (!assignment) {
    throw new ApiError(403, 'Teacher is not assigned to this subject/section');
  }

  return teacher.id;
};

exports.bulkSaveMarks = async (req, res, next) => {
  let connection;
  try {
    const { session_id, exam_id, section_id, subject_id, marks } = req.body;
    const { profileId } = req.user;
    const schoolId = req.schoolId;

    // 1. Verify Teacher assignment
    let teacherId;
    try {
      teacherId = await verifyTeacherAssignment(profileId, schoolId, session_id, section_id, subject_id);
    } catch (e) {
      if (req.user.role === 'ADMIN') {
        // Admin overrides the check. Get any valid teacher ID or set it aside.
        // For strict compliance though, we need a teacher_id for the entry. We can
        // query who the actual teacher is supposed to be.
        const assignment = await query(
          `SELECT teacher_id FROM tbl_teacher_assignments 
           WHERE session_id = ? AND section_id = ? AND subject_id = ?`,
          [session_id, section_id, subject_id]
        );
        if (!assignment) {
          throw new ApiError(400, 'No teacher is assigned to this section/subject yet. Cannot enter marks.');
        }
        teacherId = assignment.teacher_id;
      } else {
        throw e;
      }
    }

    // 2. Transact bulk save
    const pool = await connectDb();
    connection = await pool.getConnection();
    await connection.beginTransaction();

    for (const entry of marks) {
      // Upsert logic for marks: If exists, update; else insert
      const existing = await connection.query(
        `SELECT id FROM tbl_marks WHERE exam_id = ? AND student_id = ? AND subject_id = ?`, 
        [exam_id, entry.student_id, subject_id]
      );

      if (existing[0].length > 0) {
        await connection.query(
          `UPDATE tbl_marks 
           SET teacher_id = ?, theory_marks = ?, practical_marks = ?, is_absent = ?
           WHERE id = ?`,
           [teacherId, entry.theory_marks || null, entry.practical_marks || null, entry.is_absent ? 1 : 0, existing[0][0].id]
        );
      } else {
        await connection.query(
          `INSERT INTO tbl_marks (session_id, exam_id, student_id, subject_id, teacher_id, theory_marks, practical_marks, is_absent)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
           [session_id, exam_id, entry.student_id, subject_id, teacherId, entry.theory_marks || null, entry.practical_marks || null, entry.is_absent ? 1 : 0]
        );
      }
    }

    await connection.commit();
    res.json({ success: true, message: 'Marks saved successfully' });

  } catch (error) {
    if (connection) await connection.rollback();
    next(error instanceof ApiError ? error : new ApiError(500, 'Failed to save marks', error));
  } finally {
    if (connection) connection.release();
  }
};

exports.getMarksStatus = async (req, res, next) => {
  try {
    const { session_id, exam_id, section_id } = req.query;
    if (!exam_id || !section_id) return next(new ApiError(400, 'exam_id and section_id required'));

    // Queries marks completion status for all subjects in a section
    const status = await queryAll(
      `SELECT sub.id as subject_id, sub.name as subject_name, 
              IFNULL(ms.is_completed, 0) as is_completed, ms.completed_at
       FROM tbl_class_subjects cs
       JOIN tbl_sections sec ON sec.class_id = cs.class_id
       JOIN tbl_subjects sub ON sub.id = cs.subject_id
       LEFT JOIN tbl_marks_status ms ON ms.subject_id = sub.id AND ms.exam_id = ? AND ms.section_id = sec.id
       WHERE sec.id = ?`,
       [exam_id, section_id]
    );

    res.json({ success: true, status });
  } catch (error) {
    next(error);
  }
};

exports.finalizeMarks = async (req, res, next) => {
  try {
    const { exam_id, section_id, subject_id } = req.body;
    
    // Check if marks are already finalized
    const existing = await query(
      `SELECT id FROM tbl_marks_status WHERE exam_id = ? AND section_id = ? AND subject_id = ?`,
      [exam_id, section_id, subject_id]
    );

    if (existing) {
      await query(
        `UPDATE tbl_marks_status SET is_completed = 1, completed_at = NOW() WHERE id = ?`,
        [existing.id]
      );
    } else {
      await insert('tbl_marks_status', {
        exam_id, section_id, subject_id, is_completed: 1, completed_at: new Date()
      });
    }

    res.json({ success: true, message: 'Marks entry has been finalized and locked.' });
  } catch (error) {
    next(error);
  }
};
