const { insert, query, queryAll } = require('../../utils/mysql');
const { mapAuditLog } = require('../../utils/mappers');
const { paginate } = require('../../utils/pagination');

/**
 * Log an administrative action
 * @param {number} schoolId 
 * @param {number} adminId 
 * @param {string} action 
 * @param {string} entityType 
 * @param {number} entityId 
 * @param {Object} details 
 * @param {string} ipAddress 
 */
const logAction = async (schoolId, adminId, action, entityType, entityId, details = {}, ipAddress = null) => {
  return insert('tbl_audit_logs', {
    school_id: schoolId,
    admin_id: adminId || null,
    action: action,
    entity_type: entityType,
    entity_id: entityId || null,
    details: JSON.stringify(details),
    ip_address: ipAddress || null
  });
};

/**
 * Get audit logs with pagination and filters
 */
const getAuditLogs = async (schoolId, filters = {}) => {
  // Must be qualified because we join tbl_admins (which also has school_id).
  const conditions = ['al.school_id = ?'];
  const params = [schoolId];

  if (filters.action) {
    conditions.push('action = ?');
    params.push(filters.action);
  }
  if (filters.entityType) {
    conditions.push('entity_type = ?');
    params.push(filters.entityType);
  }
  if (filters.entityId) {
    conditions.push('entity_id = ?');
    params.push(filters.entityId);
  }
  if (filters.adminId) {
    conditions.push('admin_id = ?');
    params.push(filters.adminId);
  }

  const whereClause = conditions.join(' AND ');
  const dataSQL = `SELECT al.*, a.full_name AS admin_name 
                   FROM tbl_audit_logs al 
                   LEFT JOIN tbl_admins a ON a.id = al.admin_id 
                   WHERE ${whereClause} 
                   ORDER BY al.created_at DESC`;
  const countSQL = `SELECT COUNT(*) AS total FROM tbl_audit_logs al WHERE ${whereClause}`;

  return paginate(dataSQL, countSQL, params, filters.page, filters.limit, mapAuditLog);
};

module.exports = { logAction, getAuditLogs };
