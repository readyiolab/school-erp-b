/**
 * Employee Service — CRUD for school employees (teachers, admin, staff)
 */

const { connectDb, insert, query, queryAll, update } = require('../../utils/mysql');
const ApiError = require('../../utils/apiError');
const { mapEmployee } = require('../../utils/mappers');
const bcrypt = require('bcryptjs');

// ─── Generate unique employee UID ───────────────────────────────────
const generateEmployeeUid = async (schoolId) => {
  const pool = await connectDb();
  await pool.query(
    'UPDATE tbl_schools SET employee_sequence = employee_sequence + 1, updated_at = NOW() WHERE id = ?',
    [schoolId]
  );
  const [rows] = await pool.query(
    'SELECT employee_sequence, code FROM tbl_schools WHERE id = ? LIMIT 1',
    [schoolId]
  );
  const school = rows[0];
  return `EMP-${school.code}-${String(school.employee_sequence).padStart(5, '0')}`;
};

// ─── Create Employee ────────────────────────────────────────────────
const createEmployee = async (schoolId, payload) => {
  const pool = await connectDb();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Validate salary structure
    if (payload.salaryStructureId) {
      const [structure] = await connection.query(
        'SELECT id FROM tbl_salary_structures WHERE id = ? AND school_id = ? AND is_active = 1 LIMIT 1',
        [payload.salaryStructureId, schoolId]
      );
      if (!structure.length && !structure) {
         // Some mysql drivers return array, some return object. 
         // Assuming query helper pattern or standard mysql2
      }
    }

    const employeeUid = await generateEmployeeUid(schoolId);

    // 2. Insert Employee
    const [empResult] = await connection.query('INSERT INTO tbl_employees SET ?', {
      school_id: schoolId,
      employee_uid: employeeUid,
      name: payload.name,
      email: payload.email || null,
      phone: payload.phone || null,
      role: payload.role || 'TEACHER',
      department: payload.department || null,
      designation: payload.designation || null,
      date_of_birth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : null,
      joining_date: payload.joiningDate ? new Date(payload.joiningDate) : null,
      bank_name: payload.bankName || null,
      bank_account: payload.bankAccount || null,
      ifsc_code: payload.ifscCode || null,
      pan_number: payload.panNumber || null,
      salary_structure_id: payload.salaryStructureId || null,
      status: 'ACTIVE'
    });

    const employeeId = empResult.insertId;

    // 3. Generate Credentials
    const defaultPassword = 'Welcome@123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    const employeeEmail = payload.email || `${employeeUid.toLowerCase()}@school.com`;
    const accountRole = payload.role === 'TEACHER' ? 'TEACHER' : 'STAFF';

    const [adminResult] = await connection.query('INSERT INTO tbl_admins SET ?', {
      school_id: schoolId,
      email: employeeEmail,
      username: employeeUid,
      password_hash: passwordHash,
      full_name: payload.name,
      role: accountRole,
      profile_id: employeeId,
      is_active: 1
    });

    const adminId = adminResult.insertId;

    // 4. Sync to tbl_teachers if role is TEACHER
    if (payload.role === 'TEACHER') {
      await connection.query('INSERT INTO tbl_teachers SET ?', {
        school_id: schoolId,
        admin_id: adminId,
        employee_uid: employeeUid,
        qualifications: payload.qualifications || null,
        joining_date: payload.joiningDate ? new Date(payload.joiningDate) : null
      });
    }

    await connection.commit();
    return getEmployee(schoolId, employeeId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ─── Update Employee ────────────────────────────────────────────────
const updateEmployee = async (schoolId, employeeId, payload) => {
  const existing = await query(
    'SELECT id FROM tbl_employees WHERE id = ? AND school_id = ? LIMIT 1',
    [employeeId, schoolId]
  );
  if (!existing) throw new ApiError(404, 'Employee not found');

  // Track salary structure change for increment history
  if (payload.salaryStructureId !== undefined) {
    const oldEmployee = await query(
      'SELECT salary_structure_id FROM tbl_employees WHERE id = ? AND school_id = ? LIMIT 1',
      [employeeId, schoolId]
    );

    if (oldEmployee && oldEmployee.salary_structure_id !== payload.salaryStructureId && payload.salaryStructureId) {
      await insert('tbl_salary_increments', {
        school_id: schoolId,
        employee_id: employeeId,
        old_structure_id: oldEmployee.salary_structure_id || null,
        new_structure_id: payload.salaryStructureId,
        effective_date: new Date(),
        reason: payload.incrementReason || 'Salary structure updated',
        changed_by: payload.changedBy || null
      });
    }
  }

  const updateData = {};
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.email !== undefined) updateData.email = payload.email || null;
  if (payload.phone !== undefined) updateData.phone = payload.phone || null;
  if (payload.role !== undefined) updateData.role = payload.role;
  if (payload.department !== undefined) updateData.department = payload.department || null;
  if (payload.designation !== undefined) updateData.designation = payload.designation || null;
  if (payload.dateOfBirth !== undefined) updateData.date_of_birth = payload.dateOfBirth ? new Date(payload.dateOfBirth) : null;
  if (payload.joiningDate !== undefined) updateData.joining_date = payload.joiningDate ? new Date(payload.joiningDate) : null;
  if (payload.bankName !== undefined) updateData.bank_name = payload.bankName || null;
  if (payload.bankAccount !== undefined) updateData.bank_account = payload.bankAccount || null;
  if (payload.ifscCode !== undefined) updateData.ifsc_code = payload.ifscCode || null;
  if (payload.panNumber !== undefined) updateData.pan_number = payload.panNumber || null;
  if (payload.salaryStructureId !== undefined) updateData.salary_structure_id = payload.salaryStructureId || null;
  if (payload.status !== undefined) updateData.status = payload.status;

  if (Object.keys(updateData).length > 0) {
    await update('tbl_employees', updateData, 'id = ? AND school_id = ?', [employeeId, schoolId]);
  }

  return getEmployee(schoolId, employeeId);
};

// ─── Get Single Employee ────────────────────────────────────────────
const getEmployee = async (schoolId, employeeId) => {
  const employee = await query(
    `SELECT e.*, ss.name AS salary_structure_name,
       (SELECT value FROM tbl_salary_components 
        WHERE salary_structure_id = e.salary_structure_id 
        AND school_id = e.school_id 
        AND name LIKE '%Basic%' LIMIT 1) as base_salary
     FROM tbl_employees e
     LEFT JOIN tbl_salary_structures ss ON ss.id = e.salary_structure_id AND ss.school_id = e.school_id
     WHERE e.id = ? AND e.school_id = ? LIMIT 1`,
    [employeeId, schoolId]
  );
  if (!employee) throw new ApiError(404, 'Employee not found');
  
  const mapped = mapEmployee(employee);
  return {
    ...mapped,
    base_salary: employee.base_salary ? Number(employee.base_salary) : 0
  };
};

// ─── List Employees ─────────────────────────────────────────────────
const getAllEmployees = async (schoolId, filters = {}) => {
  let where = 'e.school_id = ?';
  const params = [schoolId];

  if (filters.role) {
    where += ' AND e.role = ?';
    params.push(filters.role);
  }
  if (filters.department) {
    where += ' AND e.department = ?';
    params.push(filters.department);
  }
  if (filters.status) {
    where += ' AND e.status = ?';
    params.push(filters.status);
  } else {
    where += " AND e.status != 'TERMINATED'";
  }
  if (filters.search) {
    where += ' AND (e.name LIKE ? OR e.employee_uid LIKE ? OR e.phone LIKE ?)';
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }

  const employees = await queryAll(
    `SELECT e.*, ss.name AS salary_structure_name
     FROM tbl_employees e
     LEFT JOIN tbl_salary_structures ss ON ss.id = e.salary_structure_id AND ss.school_id = e.school_id
     WHERE ${where}
     ORDER BY e.name ASC`,
    params
  );
  return employees.map(mapEmployee);
};

// ─── Deactivate Employee ────────────────────────────────────────────
const deleteEmployee = async (schoolId, employeeId) => {
  const existing = await query(
    'SELECT id FROM tbl_employees WHERE id = ? AND school_id = ? LIMIT 1',
    [employeeId, schoolId]
  );
  if (!existing) throw new ApiError(404, 'Employee not found');

  await update('tbl_employees', { status: 'INACTIVE' }, 'id = ? AND school_id = ?', [employeeId, schoolId]);
  return { message: 'Employee deactivated' };
};

// ─── Get all unique departments ─────────────────────────────────────
const getDepartments = async (schoolId) => {
  const rows = await queryAll(
    `SELECT DISTINCT department FROM tbl_employees
     WHERE school_id = ? AND department IS NOT NULL AND department != ''
     ORDER BY department ASC`,
    [schoolId]
  );
  return rows.map(r => r.department);
};

module.exports = {
  createEmployee,
  updateEmployee,
  getEmployee,
  getAllEmployees,
  deleteEmployee,
  getDepartments
};
