const { queryAll } = require('../../utils/mysql');
const { mapStudent } = require('../../utils/mappers');
const { paginate } = require('../../utils/pagination');

const searchStudents = async (schoolId, filters = {}) => {
  const conditions = ['s.school_id = ?'];
  const params = [schoolId];

  if (filters.q) {
    conditions.push('(s.name LIKE ? OR s.student_uid LIKE ? OR s.phone LIKE ?)');
    const term = `%${filters.q}%`;
    params.push(term, term, term);
  }
  if (filters.class) {
    conditions.push('s.class = ?');
    params.push(filters.class);
  }
  if (filters.section) {
    conditions.push('s.section = ?');
    params.push(filters.section);
  }
  if (filters.stream) {
    conditions.push('s.stream = ?');
    params.push(filters.stream);
  }
  if (filters.status) {
    conditions.push('s.status = ?');
    params.push(filters.status);
  }
  if (filters.gender) {
    conditions.push('s.gender = ?');
    params.push(filters.gender);
  }

  const whereClause = conditions.join(' AND ');
  const dataSQL = `SELECT s.* FROM tbl_students s WHERE ${whereClause} ORDER BY s.created_at DESC`;
  const countSQL = `SELECT COUNT(*) AS total FROM tbl_students s WHERE ${whereClause}`;

  return paginate(dataSQL, countSQL, params, filters.page, filters.limit, mapStudent);
};

module.exports = { searchStudents };
