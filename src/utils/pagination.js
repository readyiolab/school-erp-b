const { queryAll, query } = require('./mysql');

/**
 * Paginate any SQL query. Returns { data, meta }.
 *
 * @param {string} dataSQL  - The main SELECT query (without LIMIT/OFFSET)
 * @param {string} countSQL - A SELECT COUNT(*) query matching the same WHERE
 * @param {Array}  params   - Bind params shared by both queries
 * @param {number} page     - Current page (1-based)
 * @param {number} limit    - Items per page
 * @param {Function} [mapper] - Optional row mapper
 */
const paginate = async (dataSQL, countSQL, params = [], page = 1, limit = 20, mapper = null) => {
  page = Math.max(1, Number(page) || 1);
  limit = Math.min(100, Math.max(1, Number(limit) || 20));
  const offset = (page - 1) * limit;

  const [rows, countRow] = await Promise.all([
    queryAll(`${dataSQL} LIMIT ? OFFSET ?`, [...params, limit, offset]),
    query(countSQL, params)
  ]);

  const totalRows = countRow ? Number(Object.values(countRow)[0]) : 0;
  const totalPages = Math.ceil(totalRows / limit);

  return {
    items: mapper ? rows.map(mapper) : rows,
    meta: {
      page,
      limit,
      totalRows,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
};

module.exports = { paginate };
