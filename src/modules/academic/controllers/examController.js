const { query, queryAll, insert } = require('../../../utils/mysql');
const ApiError = require('../../../utils/apiError');

/**
 * List all exams for a specific session and school.
 */
exports.getExams = async (req, res, next) => {
  try {
    const { session_id, class_id } = req.query;
    const schoolId = req.schoolId;

    if (!session_id) {
      return next(new ApiError(400, 'session_id is required'));
    }

    let sql = 'SELECT * FROM tbl_exams WHERE school_id = ? AND session_id = ?';
    let params = [schoolId, session_id];

    if (class_id) {
      sql += ' AND (class_id = ? OR class_id IS NULL)';
      params.push(class_id);
    }

    const exams = await queryAll(sql + ' ORDER BY start_date DESC', params);

    res.json({ success: true, exams });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new exam entry.
 */
exports.createExam = async (req, res, next) => {
  try {
    const { session_id, name, start_date, end_date, class_id, type } = req.body;
    const schoolId = req.schoolId;

    if (!session_id || !name || !start_date || !end_date) {
      return next(new ApiError(400, 'session_id, name, start_date, and end_date are required'));
    }

    const result = await insert('tbl_exams', {
      school_id,
      session_id,
      name,
      type: type || 'TERM',
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      class_id: class_id || null
    });

    const exam = await query('SELECT * FROM tbl_exams WHERE id = ?', [result.insert_id]);

    res.status(201).json({ success: true, exam });
  } catch (error) {
    next(error);
  }
};
