const { insert, query, queryAll, update, delete: deleteRow } = require('../../utils/mysql');
const ApiError = require('../../utils/apiError');
const { mapClass, mapSection, mapStream } = require('../../utils/mappers');

const DEFAULT_CLASSES = [
  { name: 'LKG', order: 1 }, { name: 'UKG', order: 2 },
  { name: '1', order: 3 }, { name: '2', order: 4 }, { name: '3', order: 5 },
  { name: '4', order: 6 }, { name: '5', order: 7 }, { name: '6', order: 8 },
  { name: '7', order: 9 }, { name: '8', order: 10 }, { name: '9', order: 11 },
  { name: '10', order: 12 },
  { name: '11', order: 13, hasStreams: true },
  { name: '12', order: 14, hasStreams: true }
];

const DEFAULT_STREAMS = ['Science', 'Commerce', 'Arts'];

// ─── Setup School Classes ───────────────────────────────────────────
const setupSchool = async (schoolId, payload = {}) => {
  const existingClasses = await queryAll(
    'SELECT id FROM tbl_classes WHERE school_id = ?', [schoolId]
  );

  if (existingClasses.length > 0) {
    throw new ApiError(409, 'School classes already set up. Use individual endpoints to modify.');
  }

  // Create all default classes
  for (const cls of DEFAULT_CLASSES) {
    const result = await insert('tbl_classes', {
      school_id: schoolId,
      name: cls.name,
      display_order: cls.order,
      has_streams: cls.hasStreams ? 1 : 0
    });

    // Create default section A for each class
    await insert('tbl_sections', {
      school_id: schoolId,
      class_id: result.insert_id,
      name: 'A',
      max_capacity: payload.defaultCapacity || 40
    });

    // Create streams for 11 & 12
    if (cls.hasStreams) {
      for (const stream of DEFAULT_STREAMS) {
        await insert('tbl_streams', {
          school_id: schoolId,
          class_id: result.insert_id,
          name: stream
        });
      }
    }
  }

  return getClasses(schoolId);
};

// ─── Classes ────────────────────────────────────────────────────────
const getClasses = async (schoolId) => {
  const classes = await queryAll(
    'SELECT * FROM tbl_classes WHERE school_id = ? ORDER BY display_order ASC',
    [schoolId]
  );
  
  if (classes.length === 0) {
    // Auto-setup for new schools to ensure dropdowns are populated
    try {
      await setupSchool(schoolId);
      return getClasses(schoolId);
    } catch (err) {
      // If setup fails (e.g. someone else is setting it up), return empty or wait
      console.warn('Auto-setup failed in getClasses:', err.message);
    }
  }

  return classes.map(mapClass);
};

// ─── Sections ───────────────────────────────────────────────────────
const getSectionsByClass = async (schoolId, classId) => {
  const sections = await queryAll(
    `SELECT s.*, c.name AS class_name,
       (SELECT COUNT(*) FROM tbl_students st WHERE st.school_id = s.school_id AND st.class = c.name AND st.section = s.name AND st.status = 'ACTIVE') AS current_count
     FROM tbl_sections s
     INNER JOIN tbl_classes c ON c.id = s.class_id AND c.school_id = s.school_id
     WHERE s.school_id = ? AND s.class_id = ?
     ORDER BY s.name ASC`,
    [schoolId, classId]
  );
  return sections.map(mapSection);
};

const getAllSections = async (schoolId) => {
  const sections = await queryAll(
    `SELECT s.*, c.name AS class_name,
       (SELECT COUNT(*) FROM tbl_students st WHERE st.school_id = s.school_id AND st.class = c.name AND st.section = s.name AND st.status = 'ACTIVE') AS current_count
     FROM tbl_sections s
     INNER JOIN tbl_classes c ON c.id = s.class_id AND c.school_id = s.school_id
     WHERE s.school_id = ?
     ORDER BY c.display_order ASC, s.name ASC`,
    [schoolId]
  );
  return sections.map(mapSection);
};

const createSection = async (schoolId, payload) => {
  const cls = await query(
    'SELECT id FROM tbl_classes WHERE id = ? AND school_id = ? LIMIT 1',
    [payload.classId, schoolId]
  );
  if (!cls) throw new ApiError(404, 'Class not found');

  const existing = await query(
    'SELECT id FROM tbl_sections WHERE school_id = ? AND class_id = ? AND name = ? LIMIT 1',
    [schoolId, payload.classId, payload.name]
  );
  if (existing) throw new ApiError(409, `Section "${payload.name}" already exists for this class`);

  await insert('tbl_sections', {
    school_id: schoolId,
    class_id: payload.classId,
    name: payload.name,
    max_capacity: payload.maxCapacity || 40
  });

  return getSectionsByClass(schoolId, payload.classId);
};

const updateSection = async (schoolId, sectionId, payload) => {
  const section = await query(
    'SELECT id FROM tbl_sections WHERE id = ? AND school_id = ? LIMIT 1',
    [sectionId, schoolId]
  );
  if (!section) throw new ApiError(404, 'Section not found');

  const updateData = {};
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.maxCapacity !== undefined) updateData.max_capacity = payload.maxCapacity;

  if (Object.keys(updateData).length > 0) {
    await update('tbl_sections', updateData, 'id = ? AND school_id = ?', [sectionId, schoolId]);
  }

  return query(
    `SELECT s.*, c.name AS class_name,
       (SELECT COUNT(*) FROM tbl_students st WHERE st.school_id = s.school_id AND st.class = c.name AND st.section = s.name AND st.status = 'ACTIVE') AS current_count
     FROM tbl_sections s
     INNER JOIN tbl_classes c ON c.id = s.class_id AND c.school_id = s.school_id
     WHERE s.id = ? AND s.school_id = ? LIMIT 1`,
    [sectionId, schoolId]
  ).then(mapSection);
};

const deleteSection = async (schoolId, sectionId) => {
  const section = await query(
    `SELECT s.id,
       (SELECT COUNT(*) FROM tbl_students st INNER JOIN tbl_classes c2 ON c2.school_id = st.school_id AND c2.name = st.class WHERE st.school_id = s.school_id AND st.section = s.name AND st.status = 'ACTIVE') AS current_count
     FROM tbl_sections s WHERE s.id = ? AND s.school_id = ? LIMIT 1`,
    [sectionId, schoolId]
  );
  if (!section) throw new ApiError(404, 'Section not found');
  if (Number(section.current_count) > 0) {
    throw new ApiError(409, 'Cannot delete section with active students');
  }

  await deleteRow('tbl_sections', 'id = ? AND school_id = ?', [sectionId, schoolId]);
};

// ─── Capacity Check ─────────────────────────────────────────────────
const checkSectionCapacity = async (schoolId, className, sectionName) => {
  const section = await query(
    `SELECT s.max_capacity,
       (SELECT COUNT(*) FROM tbl_students st WHERE st.school_id = ? AND st.class = ? AND st.section = s.name AND st.status = 'ACTIVE') AS current_count
     FROM tbl_sections s
     INNER JOIN tbl_classes c ON c.id = s.class_id AND c.school_id = s.school_id
     WHERE s.school_id = ? AND c.name = ? AND s.name = ? LIMIT 1`,
    [schoolId, className, schoolId, className, sectionName]
  );

  if (!section) return { available: true, current: 0, max: 40 };

  return {
    available: Number(section.current_count) < Number(section.max_capacity),
    current: Number(section.current_count),
    max: Number(section.max_capacity)
  };
};

// ─── Streams ────────────────────────────────────────────────────────
const getStreamsByClass = async (schoolId, classId) => {
  const streams = await queryAll(
    `SELECT st.*, c.name AS class_name,
       (SELECT COUNT(*) FROM tbl_students s WHERE s.school_id = st.school_id AND s.class = c.name AND s.stream = st.name AND s.status = 'ACTIVE') AS current_count
     FROM tbl_streams st
     INNER JOIN tbl_classes c ON c.id = st.class_id AND c.school_id = st.school_id
     WHERE st.school_id = ? AND st.class_id = ?
     ORDER BY st.name ASC`,
    [schoolId, classId]
  );
  return streams.map(mapStream);
};

// ─── Academic Year Helper ───────────────────────────────────────────
const getCurrentAcademicYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  // Academic year runs April to March
  if (month >= 4) return `${year}-${year + 1}`;
  return `${year - 1}-${year}`;
};

module.exports = {
  setupSchool,
  getClasses,
  getSectionsByClass,
  getAllSections,
  createSection,
  updateSection,
  deleteSection,
  checkSectionCapacity,
  getStreamsByClass,
  getCurrentAcademicYear
};
