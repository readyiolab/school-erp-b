/**
 * Salary Structure Service — Reusable salary templates with earnings & deductions
 */

const { insert, query, queryAll, update, deleteRow } = require('../../utils/mysql');
const ApiError = require('../../utils/apiError');
const { mapSalaryStructure, mapSalaryComponent } = require('../../utils/mappers');

// ─── Create Salary Structure ────────────────────────────────────────
const createSalaryStructure = async (schoolId, payload) => {
  const result = await insert('tbl_salary_structures', {
    school_id: schoolId,
    name: payload.name,
    description: payload.description || null,
    is_active: 1
  });

  const structureId = result.insert_id;

  // Insert components
  if (Array.isArray(payload.components) && payload.components.length > 0) {
    for (let i = 0; i < payload.components.length; i++) {
      const comp = payload.components[i];
      await insert('tbl_salary_components', {
        school_id: schoolId,
        salary_structure_id: structureId,
        name: comp.name,
        type: comp.type,
        calc_type: comp.calcType || 'FIXED',
        value: Number(comp.value) || 0,
        percentage_of: comp.percentageOf || null,
        sort_order: comp.sortOrder ?? i
      });
    }
  }

  return getSalaryStructure(schoolId, structureId);
};

// ─── Update Salary Structure ────────────────────────────────────────
const updateSalaryStructure = async (schoolId, structureId, payload) => {
  const existing = await query(
    'SELECT id FROM tbl_salary_structures WHERE id = ? AND school_id = ? LIMIT 1',
    [structureId, schoolId]
  );
  if (!existing) throw new ApiError(404, 'Salary structure not found');

  const updateData = {};
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.description !== undefined) updateData.description = payload.description || null;
  if (payload.isActive !== undefined) updateData.is_active = payload.isActive ? 1 : 0;

  if (Object.keys(updateData).length > 0) {
    await update('tbl_salary_structures', updateData, 'id = ? AND school_id = ?', [structureId, schoolId]);
  }

  // Replace components if provided
  if (Array.isArray(payload.components)) {
    await deleteRow('tbl_salary_components', 'salary_structure_id = ? AND school_id = ?', [structureId, schoolId]);

    for (let i = 0; i < payload.components.length; i++) {
      const comp = payload.components[i];
      await insert('tbl_salary_components', {
        school_id: schoolId,
        salary_structure_id: structureId,
        name: comp.name,
        type: comp.type,
        calc_type: comp.calcType || 'FIXED',
        value: Number(comp.value) || 0,
        percentage_of: comp.percentageOf || null,
        sort_order: comp.sortOrder ?? i
      });
    }
  }

  return getSalaryStructure(schoolId, structureId);
};

// ─── Get Single Structure with Components ───────────────────────────
const getSalaryStructure = async (schoolId, structureId) => {
  const structure = await query(
    'SELECT * FROM tbl_salary_structures WHERE id = ? AND school_id = ? LIMIT 1',
    [structureId, schoolId]
  );
  if (!structure) throw new ApiError(404, 'Salary structure not found');

  const components = await queryAll(
    `SELECT * FROM tbl_salary_components
     WHERE salary_structure_id = ? AND school_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [structureId, schoolId]
  );

  return {
    ...mapSalaryStructure(structure),
    components: components.map(mapSalaryComponent)
  };
};

// ─── List All Structures ────────────────────────────────────────────
const getAllSalaryStructures = async (schoolId, includeInactive = false) => {
  const where = includeInactive
    ? 'ss.school_id = ?'
    : 'ss.school_id = ? AND ss.is_active = 1';

  const structures = await queryAll(
    `SELECT ss.*,
       (SELECT COUNT(*) FROM tbl_employees e WHERE e.salary_structure_id = ss.id AND e.school_id = ss.school_id AND e.status = 'ACTIVE') AS employee_count
     FROM tbl_salary_structures ss
     WHERE ${where}
     ORDER BY ss.name ASC`,
    [schoolId]
  );

  // Fetch components for each structure
  const result = [];
  for (const structure of structures) {
    const components = await queryAll(
      `SELECT * FROM tbl_salary_components
       WHERE salary_structure_id = ? AND school_id = ?
       ORDER BY sort_order ASC, id ASC`,
      [structure.id, schoolId]
    );
    result.push({
      ...mapSalaryStructure(structure),
      employeeCount: Number(structure.employee_count || 0),
      components: components.map(mapSalaryComponent)
    });
  }

  return result;
};

// ─── Soft-delete Structure ──────────────────────────────────────────
const deleteSalaryStructure = async (schoolId, structureId) => {
  const existing = await query(
    'SELECT id FROM tbl_salary_structures WHERE id = ? AND school_id = ? LIMIT 1',
    [structureId, schoolId]
  );
  if (!existing) throw new ApiError(404, 'Salary structure not found');

  // Check if any active employees use this structure
  const empCount = await query(
    `SELECT COUNT(*) AS cnt FROM tbl_employees
     WHERE salary_structure_id = ? AND school_id = ? AND status = 'ACTIVE'`,
    [structureId, schoolId]
  );
  if (empCount && Number(empCount.cnt) > 0) {
    throw new ApiError(409, 'Cannot delete: structure is assigned to active employees');
  }

  await update('tbl_salary_structures', { is_active: 0 }, 'id = ? AND school_id = ?', [structureId, schoolId]);
  return { message: 'Salary structure deactivated' };
};

module.exports = {
  createSalaryStructure,
  updateSalaryStructure,
  getSalaryStructure,
  getAllSalaryStructures,
  deleteSalaryStructure
};
