const { query, insert, queryAll } = require('../../../utils/mysql');
const ApiError = require('../../../utils/apiError');

exports.assignTeacher = async (req, res, next) => {
  try {
    const { session_id, teacher_id, section_id, subject_id } = req.body;

    // A real school constraint: A section can have only ONE teacher per subject.
    const existing = await query(
      `SELECT id, teacher_id FROM tbl_teacher_assignments 
       WHERE session_id = ? AND section_id = ? AND subject_id = ?`,
       [session_id, section_id, subject_id]
    );

    if (existing) {
      if (existing.teacher_id === teacher_id) {
        return res.json({ success: true, message: 'Teacher already assigned to this subject in this section.' });
      }
      return next(new ApiError(409, 'Another teacher is already assigned to this subject for this section.'));
    }

    await insert('tbl_teacher_assignments', { session_id, teacher_id, section_id, subject_id });
    res.json({ success: true, message: 'Teacher assigned successfully' });
  } catch (error) {
    next(error);
  }
};

exports.setTimetable = async (req, res, next) => {
  try {
    const { session_id, section_id, teacher_id, subject_id, day_of_week, period, start_time, end_time } = req.body;

    if (!session_id) {
      return next(new ApiError(400, 'session_id is required.'));
    }

    // Clash Check 1: Is the teacher already taking a class in that period for THIS session?
    const teacherClash = await query(
      `SELECT tbl_sections.name as section_name FROM tbl_timetables 
       JOIN tbl_sections ON tbl_timetables.section_id = tbl_sections.id
       WHERE session_id = ? AND teacher_id = ? AND day_of_week = ? AND period = ?`,
      [session_id, teacher_id, day_of_week, period]
    );

    if (teacherClash) {
      return next(new ApiError(409, `Timetable clash: Teacher is already assigned to Section ${teacherClash.section_name} during period ${period} on day ${day_of_week}.`));
    }

    // Clash Check 2: Does the section already have a subject assigned for that period?
    const sectionClash = await query(
      `SELECT tbl_subjects.name as subject_name FROM tbl_timetables
       JOIN tbl_subjects ON tbl_timetables.subject_id = tbl_subjects.id
       WHERE session_id = ? AND section_id = ? AND day_of_week = ? AND period = ?`,
      [session_id, section_id, day_of_week, period]
    );

    if (sectionClash) {
      return next(new ApiError(409, `Timetable clash: Section already has ${sectionClash.subject_name} scheduled during period ${period} on day ${day_of_week}.`));
    }

    await insert('tbl_timetables', {
      session_id, section_id, teacher_id, subject_id, day_of_week, period, start_time, end_time
    });

    res.json({ success: true, message: 'Timetable entry added successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getMySubjects = async (req, res, next) => {
  try {
    const { role, profileId, userId } = req.user;
    const schoolId = req.schoolId;

    if (role === 'ADMIN') {
      return res.json({ success: true, subjects: [] });
    }

    let assignments = [];

    if (role === 'TEACHER') {
      // Find teacher_id from tbl_teachers using the UID (profileId)
      const teacher = await query('SELECT id FROM tbl_teachers WHERE employee_uid = ? AND school_id = ?', [profileId, schoolId]);
      if (!teacher) return res.json({ success: true, subjects: [] });

      assignments = await queryAll(
        `SELECT
          ta.id as assignment_id,
          ta.subject_id,
          ta.section_id,
          ta.session_id,
          c.id as class_id,
          s.name AS subject_name,
          sec.name AS section_name,
          c.name AS class_name,
          s.is_practical
        FROM tbl_teacher_assignments ta
        JOIN tbl_subjects s ON ta.subject_id = s.id
        JOIN tbl_sections sec ON ta.section_id = sec.id
        JOIN tbl_classes c ON sec.class_id = c.id
        JOIN tbl_academic_sessions sess ON ta.session_id = sess.id
        WHERE ta.teacher_id = ? AND sec.school_id = ? AND sess.is_active = 1`,
        [teacher.id, schoolId]
      );
    } else if (role === 'STUDENT') {
      // profileId here is the student_uid
      const student = await query('SELECT class, section FROM tbl_students WHERE student_uid = ? AND school_id = ?', [profileId, schoolId]);
      if (student) {
        assignments = await queryAll(
          `SELECT
            ta.id as assignment_id,
            ta.subject_id,
            ta.section_id,
            ta.session_id,
            c.id as class_id,
            s.name AS subject_name,
            sec.name AS section_name,
            c.name AS class_name,
            s.is_practical
          FROM tbl_teacher_assignments ta
          JOIN tbl_subjects s ON ta.subject_id = s.id
          JOIN tbl_sections sec ON ta.section_id = sec.id
          JOIN tbl_classes c ON sec.class_id = c.id
          JOIN tbl_academic_sessions sess ON ta.session_id = sess.id
          WHERE c.name = ? AND sec.name = ? AND sec.school_id = ? AND sess.is_active = 1`,
          [student.class, student.section, schoolId]
        );
      }
    }

    res.json({ success: true, data: assignments, subjects: assignments });
  } catch (error) {
    next(error);
  }
};

exports.getMyTimetable = async (req, res, next) => {
  try {
    const { role, profileId, userId } = req.user;
    const schoolId = req.schoolId;

    let timetable = [];

    if (role === 'TEACHER') {
      // Find teacher_id from tbl_teachers using the UID (profileId)
      const teacher = await query('SELECT id FROM tbl_teachers WHERE employee_uid = ? AND school_id = ?', [profileId, schoolId]);
      if (!teacher) return res.json({ success: true, timetable: [] });

      timetable = await queryAll(
        `SELECT
          tt.*,
          s.name AS subject_name,
          sec.name AS section_name,
          c.name AS class_name
        FROM tbl_timetables tt
        JOIN tbl_subjects s ON tt.subject_id = s.id
        JOIN tbl_sections sec ON tt.section_id = sec.id
        JOIN tbl_classes c ON sec.class_id = c.id
        JOIN tbl_academic_sessions sess ON tt.session_id = sess.id
        WHERE tt.teacher_id = ? AND sec.school_id = ? AND sess.is_active = 1`,
        [teacher.id, schoolId]
      );
    } else if (role === 'STUDENT') {
      const student = await query('SELECT class, section FROM tbl_students WHERE student_uid = ? AND school_id = ?', [profileId, schoolId]);
      if (student) {
        timetable = await queryAll(
          `SELECT
            tt.*,
            s.name AS subject_name,
            sec.name AS section_name,
            c.name AS class_name,
            a.full_name as teacher_name
          FROM tbl_timetables tt
          JOIN tbl_subjects s ON tt.subject_id = s.id
          JOIN tbl_sections sec ON tt.section_id = sec.id
          JOIN tbl_classes c ON sec.class_id = c.id
          JOIN tbl_teachers t ON tt.teacher_id = t.id
          JOIN tbl_admins a ON t.admin_id = a.id
          JOIN tbl_academic_sessions sess ON tt.session_id = sess.id
          WHERE c.name = ? AND sec.name = ? AND sec.school_id = ? AND sess.is_active = 1`,
          [student.class, student.section, schoolId]
        );
      }
    }

    res.json({ success: true, data: timetable, timetable });
  } catch (error) {
    next(error);
  }
};

exports.getSectionTimetable = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const schoolId = req.schoolId;

    const timetable = await queryAll(
      `SELECT 
        tt.*, 
        s.name AS subject_name,
        a.full_name as teacher_name
      FROM tbl_timetables tt
      JOIN tbl_subjects s ON tt.subject_id = s.id
      JOIN tbl_teachers t ON tt.teacher_id = t.id
      JOIN tbl_admins a ON t.admin_id = a.id
      JOIN tbl_sections sec ON tt.section_id = sec.id
      JOIN tbl_academic_sessions sess ON tt.session_id = sess.id
      WHERE tt.section_id = ? AND sec.school_id = ? AND sess.is_active = 1`,
      [sectionId, schoolId]
    );

    res.json({ success: true, data: timetable, timetable });
  } catch (error) {
    next(error);
  }
};
