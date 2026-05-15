const { query } = require('../src/utils/mysql');

async function migrate() {
  try {
    console.log('Finalizing tbl_timetables migration...');
    
    // 1. Create simple indexes for FKs to allow dropping unique constraints
    console.log('Creating helper indexes...');
    try { await query("CREATE INDEX idx_teacher_id ON tbl_timetables (teacher_id)"); } catch(e) {}
    try { await query("CREATE INDEX idx_section_id ON tbl_timetables (section_id)"); } catch(e) {}
    
    // 2. Drop old unique keys
    console.log('Dropping old unique constraints...');
    try { await query("ALTER TABLE tbl_timetables DROP INDEX uk_teacher_time"); } catch(e) {}
    try { await query("ALTER TABLE tbl_timetables DROP INDEX uk_section_time"); } catch(e) {}
    
    // 3. Add new unique keys with session_id
    console.log('Adding new session-aware unique constraints...');
    try { await query("ALTER TABLE tbl_timetables ADD UNIQUE KEY uk_teacher_session_time (session_id, teacher_id, day_of_week, period)"); } catch(e) {}
    try { await query("ALTER TABLE tbl_timetables ADD UNIQUE KEY uk_section_session_time (session_id, section_id, day_of_week, period)"); } catch(e) {}
    
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    process.exit();
  }
}

migrate();
