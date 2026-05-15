const { query, queryAll, insert, update } = require('../../../utils/mysql');
const ApiError = require('../../../utils/apiError');

/**
 * Get active session for a school
 */
const getActiveSession = async (schoolId) => {
  const session = await query(
    'SELECT id FROM tbl_academic_sessions WHERE school_id = ? AND is_active = 1 LIMIT 1',
    [schoolId]
  );
  if (!session) throw new ApiError(404, 'No active academic session found for this school');
  return session.id;
};

/**
 * Student applies for leave
 */
exports.applyLeave = async (req, res, next) => {
  try {
    const { 
      student_id, 
      start_date, 
      end_date, 
      reason, 
      letter_content, 
      is_half_day, 
      half_day_type 
    } = req.body;
    
    const schoolId = req.user.schoolId;
    const { profileId, role } = req.user;
    const sessionId = await getActiveSession(schoolId);

    // If student is applying for themselves, use their UID
    const targetUid = role === 'STUDENT' ? profileId : student_id;

    // Resolve internal student ID from UID
    const student = await query('SELECT id FROM tbl_students WHERE student_uid = ? AND school_id = ?', [targetUid, schoolId]);
    if (!student) {
      throw new ApiError(404, 'Student profile not found');
    }

    const result = await insert('tbl_leave_requests', {
      school_id: schoolId,
      student_id: student.id,
      session_id: sessionId,
      start_date,
      end_date,
      reason,
      letter_content,
      is_half_day: is_half_day ? 1 : 0,
      half_day_type: is_half_day ? half_day_type : null,
      status: 'PENDING'
    });

    res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully',
      data: { leave_id: result.insert_id }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get leaves for approval (Teacher/Admin view)
 */
exports.getPendingLeaves = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { section_id, status } = req.query;

    let whereClause = 'l.school_id = ?';
    let params = [schoolId];

    if (status) {
      whereClause += ' AND l.status = ?';
      params.push(status);
    } else {
      whereClause += " AND l.status = 'PENDING'";
    }

    if (section_id) {
      whereClause += ' AND s.section_id = ?'; // This assumes we join with student/section
      params.push(section_id);
    }

    const sql = `
      SELECT 
        l.*, 
        st.student_name as student_name, 
        st.student_uid as student_uid,
        st.class,
        st.section
      FROM tbl_leave_requests l
      JOIN tbl_students st ON l.student_id = st.id
      WHERE ${whereClause}
      ORDER BY l.created_at DESC
    `;

    const leaves = await queryAll(sql, params);

    res.status(200).json({
      success: true,
      data: leaves
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Teacher/Admin updates leave status (Approve/Reject)
 */
exports.updateLeaveStatus = async (req, res, next) => {
  try {
    const { leave_id, status, teacher_note } = req.body;
    const adminId = req.user.adminId;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      throw new ApiError(400, 'Invalid status. Use APPROVED or REJECTED');
    }

    await update('tbl_leave_requests', {
      status,
      teacher_note,
      approved_by: adminId,
      updated_at: new Date()
    }, 'id = ?', [leave_id]);

    res.status(200).json({
      success: true,
      message: `Leave request ${status.toLowerCase()} successfully`
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get leave history for a specific student
 */
exports.getStudentLeaves = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const schoolId = req.user.schoolId;

    const leaves = await queryAll(
      'SELECT * FROM tbl_leave_requests WHERE student_id = ? AND school_id = ? ORDER BY start_date DESC',
      [student_id, schoolId]
    );

    res.status(200).json({
      success: true,
      data: leaves
    });
  } catch (err) {
    next(err);
  }
};
