const { query } = require('../src/utils/mysql');

async function migrate() {
  try {
    console.log('Adding session_id to tbl_timetables...');
    
    // Check if column exists
    const columns = await query("SHOW COLUMNS FROM tbl_timetables LIKE 'session_id'");
    if (columns) {
      console.log('Column session_id already exists.');
    } else {
      await query("ALTER TABLE tbl_timetables ADD COLUMN session_id INT NOT NULL AFTER id");
      await query("ALTER TABLE tbl_timetables ADD CONSTRAINT fk_tt_session FOREIGN KEY (session_id) REFERENCES tbl_academic_sessions(id) ON DELETE CASCADE");
      
      // Update existing records to use the active session (if any)
      const activeSession = await query("SELECT id FROM tbl_academic_sessions WHERE is_active = 1 LIMIT 1");
      if (activeSession) {
        await query("UPDATE tbl_timetables SET session_id = ?", [activeSession.id]);
        console.log(`Updated existing timetables to session ${activeSession.id}`);
      }
      
      // Update unique keys to include session_id
      await query("ALTER TABLE tbl_timetables DROP INDEX uk_teacher_time");
      await query("ALTER TABLE tbl_timetables DROP INDEX uk_section_time");
      await query("ALTER TABLE tbl_timetables ADD UNIQUE KEY uk_teacher_session_time (session_id, teacher_id, day_of_week, period)");
      await query("ALTER TABLE tbl_timetables ADD UNIQUE KEY uk_section_session_time (session_id, section_id, day_of_week, period)");
      
      console.log('Migration completed successfully.');
    }
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    process.exit();
  }
}

migrate();
