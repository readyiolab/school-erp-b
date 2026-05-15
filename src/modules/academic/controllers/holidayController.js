const { query, queryAll, insert, update, deleteRow } = require('../../../utils/mysql');
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
 * List all holidays for the current session
 */
exports.getHolidays = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const sessionId = await getActiveSession(schoolId);

    const holidays = await queryAll(
      'SELECT * FROM tbl_holidays WHERE school_id = ? AND session_id = ? ORDER BY holiday_date ASC',
      [schoolId, sessionId]
    );

    res.status(200).json({
      success: true,
      data: holidays
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Add a new holiday
 */
exports.addHoliday = async (req, res, next) => {
  try {
    const { name, description, holiday_date, is_half_day } = req.body;
    const schoolId = req.user.schoolId;
    const sessionId = await getActiveSession(schoolId);

    if (!name || !holiday_date) {
      throw new ApiError(400, 'Holiday name and date are required');
    }

    const result = await insert('tbl_holidays', {
      school_id: schoolId,
      session_id: sessionId,
      name,
      description,
      holiday_date,
      is_half_day: is_half_day ? 1 : 0
    });

    res.status(201).json({
      success: true,
      message: 'Holiday added successfully',
      data: { id: result.insert_id }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a holiday
 */
exports.deleteHoliday = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;

    await deleteRow('tbl_holidays', 'id = ? AND school_id = ?', [id, schoolId]);

    res.status(200).json({
      success: true,
      message: 'Holiday deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};
