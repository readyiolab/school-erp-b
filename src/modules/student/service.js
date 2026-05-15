const { connectDb, insert, query, queryAll, update, delete: deleteRow } = require('../../utils/mysql');
const ApiError = require('../../utils/apiError');
const { mapStudent } = require('../../utils/mappers');
const { paginate } = require('../../utils/pagination');
const { decryptId } = require('../../utils/encryption');
const { uploadFromBuffer } = require('../../utils/cloudinary');

/**
 * Get students with pagination and advanced filtering
 */
const getStudents = async (schoolId, filters = {}) => {
  const conditions = ['school_id = ?'];
  const params = [schoolId];

  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  } else {
    // Default to ACTIVE if no status filter is provided
    conditions.push("status = 'ACTIVE'");
  }

  if (filters.class) {
    conditions.push('class = ?');
    params.push(filters.class);
  }

  if (filters.section) {
    conditions.push('section = ?');
    params.push(filters.section);
  }

  if (filters.stream) {
    conditions.push('stream = ?');
    params.push(filters.stream);
  }

  if (filters.gender) {
    conditions.push('gender = ?');
    params.push(filters.gender);
  }

  if (filters.search) {
    conditions.push('(name LIKE ? OR student_uid LIKE ? OR phone LIKE ?)');
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const whereClause = conditions.join(' AND ');
  const dataSQL = `SELECT * FROM tbl_students WHERE ${whereClause} ORDER BY class ASC, section ASC, name ASC`;
  const countSQL = `SELECT COUNT(*) AS total FROM tbl_students WHERE ${whereClause}`;

  return paginate(dataSQL, countSQL, params, filters.page, filters.limit, mapStudent);
};

/**
 * Get student by ID
 */
const getStudentById = async (schoolId, id) => {
  const student = await query(
    'SELECT * FROM tbl_students WHERE id = ? AND school_id = ? LIMIT 1',
    [id, schoolId]
  );

  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  return mapStudent(student);
};

/**
 * Get student by encrypted public ID
 */
const getStudentByEncryptedId = async (schoolId, encryptedId) => {
  const decryptedId = decryptId(encryptedId);
  if (!decryptedId) {
    throw new ApiError(400, 'Invalid student identifier');
  }
  return getStudentById(schoolId, decryptedId);
};

/**
 * Update student profile
 */
const updateStudent = async (schoolId, id, payload, file = null) => {
  const student = await getStudentById(schoolId, id);

  const updateData = {};

  // Standard fields
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.class !== undefined) updateData.class = payload.class;
  if (payload.section !== undefined) updateData.section = payload.section;
  if (payload.stream !== undefined) updateData.stream = payload.stream || null;
  if (payload.parentName !== undefined) updateData.parent_name = payload.parentName;
  if (payload.phone !== undefined) updateData.phone = payload.phone;
  if (payload.address !== undefined) updateData.address = payload.address;
  if (payload.email !== undefined) updateData.email = payload.email || null;
  if (payload.status !== undefined) updateData.status = payload.status;
  if (payload.dateOfBirth !== undefined) updateData.date_of_birth = payload.dateOfBirth ? new Date(payload.dateOfBirth) : null;
  if (payload.gender !== undefined) updateData.gender = payload.gender;
  if (payload.aadhaarNumber !== undefined) updateData.aadhaar_number = payload.aadhaarNumber;

  // Handle photo re-upload
  if (file) {
    const upload = await uploadFromBuffer(file.buffer, { folder: 'school_erp/students' });
    updateData.photo_url = upload.secure_url;
  }

  if (Object.keys(updateData).length > 0) {
    await update('tbl_students', updateData, 'id = ? AND school_id = ?', [id, schoolId]);
  }

  return getStudentById(schoolId, id);
};

const deleteStudent = async (schoolId, id) => {
  const student = await getStudentById(schoolId, id);
  // Soft delete by setting status if preferred, but here we do hard delete per original logic
  // However, in production ERP, hard delete of students is risky due to data consistency.
  // We'll stick to hard delete for now as per previous version but update status to INACTIVE is better.
  await deleteRow('tbl_students', 'id = ? AND school_id = ?', [id, schoolId]);
};

module.exports = {
  getStudents,
  getStudentById,
  getStudentByEncryptedId,
  updateStudent,
  deleteStudent
};
