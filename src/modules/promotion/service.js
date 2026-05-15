const { connectDb, query, queryAll, insert } = require('../../utils/mysql');
const ApiError = require('../../utils/apiError');
const { mapPromotion } = require('../../utils/mappers');
const { getCurrentAcademicYear } = require('../school/service');

const CLASS_ORDER = ['LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

const getNextClass = (currentClass) => {
  const idx = CLASS_ORDER.indexOf(currentClass);
  if (idx === -1 || idx === CLASS_ORDER.length - 1) return null; // Class 12 → no next class
  return CLASS_ORDER[idx + 1];
};

/**
 * Preview what promotion will do
 */
const previewPromotion = async (schoolId, filters = {}) => {
  const conditions = ['school_id = ?', "status = 'ACTIVE'"];
  const params = [schoolId];

  if (filters.class) {
    conditions.push('class = ?');
    params.push(filters.class);
  }
  if (filters.section) {
    conditions.push('section = ?');
    params.push(filters.section);
  }

  const students = await queryAll(
    `SELECT id, student_uid, name, class, section, stream FROM tbl_students WHERE ${conditions.join(' AND ')} ORDER BY class, section, name`,
    params
  );

  return students.map((s) => {
    const nextClass = getNextClass(s.class);
    return {
      studentId: s.id,
      studentUid: s.student_uid,
      name: s.name,
      fromClass: s.class,
      fromSection: s.section,
      toClass: nextClass,
      toSection: filters.toSection || s.section,
      action: nextClass ? 'PROMOTE' : 'ALUMNI'
    };
  });
};

/**
 * Execute promotion for students
 */
const promoteStudents = async (schoolId, payload, adminId) => {
  const pool = await connectDb();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const academicYear = getCurrentAcademicYear();
    const conditions = ['school_id = ?', "status = 'ACTIVE'"];
    const params = [schoolId];

    if (payload.class) {
      conditions.push('class = ?');
      params.push(payload.class);
    }
    if (payload.section) {
      conditions.push('section = ?');
      params.push(payload.section);
    }

    // If specific student IDs are given
    if (payload.studentIds && payload.studentIds.length > 0) {
      conditions.push(`id IN (${payload.studentIds.map(() => '?').join(',')})`);
      params.push(...payload.studentIds);
    }

    const [students] = await connection.query(
      `SELECT id, student_uid, name, class, section, stream FROM tbl_students WHERE ${conditions.join(' AND ')} FOR UPDATE`,
      params
    );

    const results = [];

    for (const student of students) {
      const nextClass = getNextClass(student.class);
      const toSection = payload.toSection || student.section;

      if (nextClass) {
        // Promote to next class
        await connection.query(
          'UPDATE tbl_students SET class = ?, section = ?, status = ?, updated_at = NOW() WHERE id = ?',
          [nextClass, toSection, 'ACTIVE', student.id]
        );
      } else {
        // Class 12 → mark as ALUMNI
        await connection.query(
          "UPDATE tbl_students SET status = 'ALUMNI', updated_at = NOW() WHERE id = ?",
          [student.id]
        );
      }

      // Log promotion
      await connection.query('INSERT INTO tbl_promotions SET ?', {
        school_id: schoolId,
        student_id: student.id,
        from_class: student.class,
        from_section: student.section,
        to_class: nextClass || 'ALUMNI',
        to_section: nextClass ? toSection : null,
        academic_year: academicYear,
        promoted_by: adminId,
        promoted_at: new Date()
      });

      results.push({
        studentId: student.id,
        studentUid: student.student_uid,
        name: student.name,
        fromClass: student.class,
        toClass: nextClass || 'ALUMNI',
        status: 'SUCCESS'
      });
    }

    await connection.commit();
    return { promoted: results.length, results };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Get promotion history
 */
const getPromotionHistory = async (schoolId, filters = {}) => {
  const conditions = ['p.school_id = ?'];
  const params = [schoolId];

  if (filters.academicYear) {
    conditions.push('p.academic_year = ?');
    params.push(filters.academicYear);
  }

  const promotions = await queryAll(
    `SELECT p.*, s.name AS student_name, s.student_uid
     FROM tbl_promotions p
     INNER JOIN tbl_students s ON s.id = p.student_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY p.promoted_at DESC`,
    params
  );

  return promotions.map(mapPromotion);
};

module.exports = { previewPromotion, promoteStudents, getPromotionHistory };
