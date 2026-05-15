const { connectDb, query, queryAll, insert, update } = require('../../../utils/mysql');
const ApiError = require('../../../utils/apiError');

/**
 * Validates if the currently logged in user is actually assigned to teach 
 * the requested subject in the requested section.
 */
const verifyTeacherAssignment = async (adminId, sessionId, sectionId, subjectId) => {
  const teacher = await query(`SELECT id FROM tbl_teachers WHERE admin_id = ?`, [adminId]);
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

exports.getAttendanceSheet = async (req, res, next) => {
  try {
    const { session_id, section_id, subject_id, date, period } = req.query;
    
    if (!session_id || !section_id || !date || !period) {
      return next(new ApiError(400, 'session_id, section_id, date, and period are required'));
    }

    // 1. Check if it's a holiday
    const holiday = await query(
      'SELECT name, is_half_day FROM tbl_holidays WHERE school_id = ? AND holiday_date = ?',
      [req.schoolId, date]
    );

    // 2. Get all students in this section with their status + leave info
    const students = await queryAll(
      `SELECT s.id as student_id, s.name as student_name, s.student_uid as admission_number,
              COALESCE(att.status, 
                CASE 
                  WHEN lr.id IS NOT NULL THEN 'LEAVE'
                  ELSE NULL 
                END
              ) as attendance_status,
              att.remarks,
              lr.reason as leave_reason,
              lr.is_half_day as leave_is_half_day
       FROM tbl_students s
       JOIN tbl_sections sec ON sec.name = s.section AND sec.school_id = s.school_id
       JOIN tbl_classes cls ON cls.name = s.class AND cls.school_id = s.school_id AND cls.id = sec.class_id
       LEFT JOIN tbl_student_attendance att ON att.student_id = s.id 
            AND att.date = ? AND att.period = ?
       LEFT JOIN tbl_leave_requests lr ON lr.student_id = s.id 
            AND lr.status = 'APPROVED'
            AND ? BETWEEN lr.start_date AND lr.end_date
            AND (
              lr.is_half_day = 0 OR 
              (lr.is_half_day = 1 AND (
                (lr.half_day_type = 'MORNING' AND ? <= 4) OR 
                (lr.half_day_type = 'AFTERNOON' AND ? >= 5)
              ))
            )
       WHERE sec.id = ? AND s.status = 'ACTIVE'
       ORDER BY s.name ASC`,
      [date, period, date, period, period, section_id]
    );

    res.json({ 
      success: true, 
      students,
      holiday: holiday ? { name: holiday.name, is_half_day: !!holiday.is_half_day } : null
    });
  } catch (error) {
    next(error);
  }
};

exports.markBulkAttendance = async (req, res, next) => {
  let connection;
  try {
    const { session_id, section_id, subject_id, date, period, attendance } = req.body;
    const adminId = req.user.adminId;
    const schoolId = req.schoolId;

    // 1. Verify Teacher assignment if subject_id is provided
    let teacherId = null;
    if (subject_id) {
      try {
        teacherId = await verifyTeacherAssignment(adminId, session_id, section_id, subject_id);
      } catch (e) {
        if (req.user.role === 'ADMIN') {
           // Admin override logic
           const assignment = await query(
             `SELECT teacher_id FROM tbl_teacher_assignments 
              WHERE session_id = ? AND section_id = ? AND subject_id = ?`,
             [session_id, section_id, subject_id]
           );
           teacherId = assignment ? assignment.teacher_id : null;
        } else {
          throw e;
        }
      }
    }

    const pool = await connectDb();
    connection = await pool.getConnection();
    await connection.beginTransaction();

    for (const record of attendance) {
      // Upsert logic
      const existing = await connection.query(
        `SELECT id FROM tbl_student_attendance WHERE student_id = ? AND date = ? AND period = ?`,
        [record.student_id, date, period]
      );

      if (existing[0].length > 0) {
        await connection.query(
          `UPDATE tbl_student_attendance 
           SET status = ?, remarks = ?, teacher_id = ?, subject_id = ?, updated_at = NOW()
           WHERE id = ?`,
          [record.status, record.remarks || null, teacherId, subject_id || null, existing[0][0].id]
        );
      } else {
        await connection.query(
          `INSERT INTO tbl_student_attendance (school_id, session_id, section_id, student_id, subject_id, teacher_id, date, period, status, remarks)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [schoolId, session_id, section_id, record.student_id, subject_id || null, teacherId, date, period, record.status, record.remarks || null]
        );
      }
    }

    await connection.commit();
    res.json({ success: true, message: 'Attendance marked successfully' });

  } catch (error) {
    if (connection) await connection.rollback();
    next(error instanceof ApiError ? error : new ApiError(500, 'Failed to save attendance', error));
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Get all students for a teacher's section (Just the list)
 */
exports.getMyStudents = async (req, res, next) => {
  try {
    const { section_id } = req.query;
    if (!section_id) return next(new ApiError(400, 'section_id is required'));

    const students = await queryAll(
      `SELECT s.id as student_id, s.name as student_name, s.student_uid as admission_number, 
              s.phone as parent_phone, s.parent_name
       FROM tbl_students s
       JOIN tbl_sections sec ON sec.name = s.section AND sec.school_id = s.school_id
       JOIN tbl_classes cls ON cls.name = s.class AND cls.id = sec.class_id AND cls.school_id = s.school_id
       WHERE sec.id = ? AND s.status = 'ACTIVE'
       ORDER BY s.name ASC`,
      [section_id]
    );

    res.json({ success: true, students });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current punch status for a teacher
 */
exports.getPunchStatus = async (req, res, next) => {
  try {
    const { profileId } = req.user;
    const schoolId = req.schoolId;
    const today = new Date().toISOString().split('T')[0];

    const teacher = await query('SELECT id FROM tbl_teachers WHERE employee_uid = ? AND school_id = ?', [profileId, schoolId]);
    if (!teacher) return res.json({ success: true, status: 'NONE' });

    const current = await query(
      'SELECT punch_in, punch_out FROM tbl_teacher_attendance WHERE teacher_id = ? AND date = ?',
      [teacher.id, today]
    );

    if (!current) {
      return res.json({ success: true, status: 'NONE' });
    } else if (!current.punch_out) {
      return res.json({ success: true, status: 'IN', punchIn: current.punch_in });
    } else {
      return res.json({ success: true, status: 'OUT', punchIn: current.punch_in, punchOut: current.punch_out });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Punch In/Out for Teachers
 * Also syncs with tbl_employee_attendance (Payroll Daily Status)
 */
exports.punchTeacherAttendance = async (req, res, next) => {
  try {
    const profileId = req.user.profileId; // Standard UID in this project
    const userRole = req.user.role;
    const schoolId = req.schoolId;

    if (userRole !== 'TEACHER') {
      return next(new ApiError(403, 'Only teachers can punch attendance'));
    }

    // 1. Get teacher internal ID and verify school_id
    const teacher = await query('SELECT id FROM tbl_teachers WHERE employee_uid = ? AND school_id = ?', [profileId, schoolId]);
    if (!teacher) {
      return next(new ApiError(404, 'Teacher profile not found'));
    }

    const teacherId = teacher.id;
    const today = new Date().toISOString().split('T')[0];

    // 2. Get Employee ID for payroll sync
    const employee = await query('SELECT id FROM tbl_employees WHERE employee_uid = ? AND school_id = ?', [profileId, schoolId]);
    if (!employee) {
      return next(new ApiError(404, 'Employee record not found for this teacher'));
    }
    const employeeId = employee.id;

    // 2. Check current status in tbl_teacher_attendance
    const current = await query(
      'SELECT id, punch_in, punch_out FROM tbl_teacher_attendance WHERE teacher_id = ? AND date = ?',
      [teacherId, today]
    );

    const now = new Date();
    let status = 'IN';

    if (!current) {
      // Punch In
      await insert('tbl_teacher_attendance', {
        school_id: schoolId,
        teacher_id: teacherId,
        date: today,
        punch_in: now,
        status: 'PRESENT'
      });
      status = 'IN';

      // SYNC: Mark as PRESENT in payroll attendance table
      const existingPayroll = await query(
        'SELECT id FROM tbl_employee_attendance WHERE employee_id = ? AND date = ? AND school_id = ?',
        [employeeId, today, schoolId]
      );
      if (!existingPayroll) {
        await insert('tbl_employee_attendance', {
          school_id: schoolId,
          employee_id: employeeId,
          date: today,
          status: 'PRESENT',
          remarks: 'Auto-marked via Teacher Portal Punch-In'
        });
      }
    } else if (!current.punch_out) {
      // Punch Out
      await update('tbl_teacher_attendance', { 
        punch_out: now, 
        updated_at: now 
      }, 'id = ?', [current.id]);
      status = 'OUT';
    } else {
      return res.status(400).json({ success: false, message: 'Already punched out for today' });
    }

    res.json({ 
      success: true, 
      message: status === 'IN' ? 'Punched in successfully' : 'Punched out successfully', 
      status, 
      punchIn: current ? current.punch_in : now,
      punchOut: status === 'OUT' ? now : null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Teacher Attendance History
 */
exports.getTeacherAttendance = async (req, res, next) => {
  try {
    const { profileId } = req.user;
    const schoolId = req.schoolId;
    
    // Find teacher_id from tbl_teachers using UID
    const teacher = await query('SELECT id FROM tbl_teachers WHERE employee_uid = ? AND school_id = ?', [profileId, schoolId]);
    if (!teacher) return res.json({ success: true, history: [] });

    const history = await queryAll(
      'SELECT * FROM tbl_teacher_attendance WHERE teacher_id = ? ORDER BY date DESC LIMIT 30',
      [teacher.id]
    );
    res.json({ success: true, history });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Own Attendance Summary (For Students)
 */
exports.getMyAttendanceSummary = async (req, res, next) => {
  try {
    const { role, profileId } = req.user;
    const schoolId = req.schoolId;
    if (role !== 'STUDENT') return next(new ApiError(403, 'Only students can access this summary'));

    // profileId is student_uid, need internal ID
    const student = await query('SELECT id FROM tbl_students WHERE student_uid = ? AND school_id = ?', [profileId, schoolId]);
    if (!student) return next(new ApiError(404, 'Student profile not found'));

    const summary = await queryAll(
      `SELECT 
        att.status, 
        COUNT(*) as count 
       FROM tbl_student_attendance att
       JOIN tbl_academic_sessions sess ON att.session_id = sess.id
       WHERE att.student_id = ? AND sess.is_active = 1
       GROUP BY att.status`,
      [student.id]
    );

    const history = await queryAll(
      `SELECT att.date, att.status, att.remarks, att.period
       FROM tbl_student_attendance att
       JOIN tbl_academic_sessions sess ON att.session_id = sess.id
       WHERE att.student_id = ? AND sess.is_active = 1
       ORDER BY att.date DESC LIMIT 50`,
      [student.id]
    );

    const counts = summary.reduce((acc, curr) => {
      acc[curr.status] = curr.count;
      return acc;
    }, {});

    const presentDays = (counts['PRESENT'] || 0) + (counts['LATE'] || 0) + (counts['HALF_DAY'] || 0) * 0.5;
    const totalDays = summary.reduce((acc, curr) => acc + curr.count, 0);
    const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    res.json({ 
      success: true, 
      data: {
        summary: counts,
        present_days: presentDays,
        total_days: totalDays,
        attendance_percentage: percentage
      },
      history 
    });
  } catch (error) {
    next(error);
  }
};
