const { insert, query, queryAll, update, delete: deleteRow } = require('../../utils/mysql');
const ApiError = require('../../utils/apiError');
const { mapFeeStructure } = require('../../utils/mappers');

const getFeeStructureItems = async (schoolId, feeStructureIds) => {
  if (!feeStructureIds.length) return new Map();

  const placeholders = feeStructureIds.map(() => '?').join(', ');
  const rows = await queryAll(
    `SELECT *
     FROM tbl_fee_structure_items
     WHERE school_id = ? AND fee_structure_id IN (${placeholders})
     ORDER BY sort_order ASC, id ASC`,
    [schoolId, ...feeStructureIds]
  );

  const map = new Map();
  feeStructureIds.forEach((id) => map.set(id, []));
  rows.forEach((row) => {
    const current = map.get(row.fee_structure_id) || [];
    current.push({
      id: row.id,
      feeStructureId: row.fee_structure_id,
      name: row.item_name,
      amount: Number(row.amount),
      sortOrder: row.sort_order,
    });
    map.set(row.fee_structure_id, current);
  });
  return map;
};

const attachItems = async (schoolId, structures) => {
  const ids = structures.map((item) => item.id);
  const itemsMap = await getFeeStructureItems(schoolId, ids);
  return structures.map((structure) => ({
    ...structure,
    items: itemsMap.get(structure.id) || [],
  }));
};

const createFeeStructure = async (schoolId, payload) => {
  const result = await insert('tbl_fee_structures', {
    school_id: schoolId,
    name: payload.name,
    fee_type: payload.feeType,
    frequency: payload.frequency,
    amount: payload.amount,
    fine_per_day: payload.finePerDay || 0,
    grace_period_days: payload.gracePeriodDays ?? 5,
    applicable_classes: payload.applicableClasses ? JSON.stringify(payload.applicableClasses) : null,
    is_active: 1
  });

  const items = Array.isArray(payload.items) ? payload.items : [];
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    await insert('tbl_fee_structure_items', {
      school_id: schoolId,
      fee_structure_id: result.insert_id,
      item_name: item.name,
      amount: item.amount,
      sort_order: item.sortOrder ?? index
    });
  }

  return getFeeStructureById(schoolId, result.insert_id);
};

const getFeeStructures = async (schoolId, filters = {}) => {
  const conditions = ['school_id = ?'];
  const params = [schoolId];

  if (filters.feeType) {
    conditions.push('fee_type = ?');
    params.push(filters.feeType);
  }
  if (filters.isActive !== undefined) {
    conditions.push('is_active = ?');
    params.push(filters.isActive ? 1 : 0);
  }

  const rows = await queryAll(
    `SELECT * FROM tbl_fee_structures WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
    params
  );

  const mapped = await attachItems(schoolId, rows.map(mapFeeStructure));

  if (filters.applicableClass) {
    return mapped.filter((item) => {
      if (!item.applicableClasses || item.applicableClasses.length === 0) return true;
      return item.applicableClasses.includes(filters.applicableClass);
    });
  }

  return mapped;
};

const getFeeStructureById = async (schoolId, id) => {
  const row = await query(
    'SELECT * FROM tbl_fee_structures WHERE id = ? AND school_id = ? LIMIT 1',
    [id, schoolId]
  );
  if (!row) throw new ApiError(404, 'Fee structure not found');
  const [result] = await attachItems(schoolId, [mapFeeStructure(row)]);
  return result;
};

const updateFeeStructure = async (schoolId, id, payload) => {
  await getFeeStructureById(schoolId, id);

  const updateData = {};
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.feeType !== undefined) updateData.fee_type = payload.feeType;
  if (payload.frequency !== undefined) updateData.frequency = payload.frequency;
  if (payload.amount !== undefined) updateData.amount = payload.amount;
  if (payload.finePerDay !== undefined) updateData.fine_per_day = payload.finePerDay;
  if (payload.gracePeriodDays !== undefined) updateData.grace_period_days = payload.gracePeriodDays;
  if (payload.applicableClasses !== undefined) updateData.applicable_classes = JSON.stringify(payload.applicableClasses);
  if (payload.isActive !== undefined) updateData.is_active = payload.isActive ? 1 : 0;

  if (Object.keys(updateData).length > 0) {
    await update('tbl_fee_structures', updateData, 'id = ? AND school_id = ?', [id, schoolId]);
  }

  if (Array.isArray(payload.items)) {
    await deleteRow('tbl_fee_structure_items', 'fee_structure_id = ? AND school_id = ?', [id, schoolId]);
    for (let index = 0; index < payload.items.length; index++) {
      const item = payload.items[index];
      await insert('tbl_fee_structure_items', {
        school_id: schoolId,
        fee_structure_id: id,
        item_name: item.name,
        amount: item.amount,
        sort_order: item.sortOrder ?? index
      });
    }
  }

  return getFeeStructureById(schoolId, id);
};

const deleteFeeStructure = async (schoolId, id) => {
  await getFeeStructureById(schoolId, id);

  const assignments = await query(
    'SELECT id FROM tbl_fee_assignments WHERE fee_structure_id = ? AND school_id = ? LIMIT 1',
    [id, schoolId]
  );
  if (assignments) {
    throw new ApiError(409, 'Cannot delete fee structure with existing assignments. Deactivate it instead.');
  }

  await deleteRow('tbl_fee_structures', 'id = ? AND school_id = ?', [id, schoolId]);
};

module.exports = { createFeeStructure, getFeeStructures, getFeeStructureById, updateFeeStructure, deleteFeeStructure };
