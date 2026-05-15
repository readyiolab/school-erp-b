// Quick migration: Add session_id column to tbl_timetables
const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'password',
    database: process.env.DB_NAME || 'school_erp'
  });

  try {
    // Check if column already exists
    const [cols] = await conn.query(`SHOW COLUMNS FROM tbl_timetables LIKE 'session_id'`);
    if (cols.length > 0) {
      console.log('session_id column already exists. Nothing to do.');
    } else {
      await conn.query(`ALTER TABLE tbl_timetables ADD COLUMN session_id INT NULL AFTER id`);
      console.log('Added session_id column to tbl_timetables.');

      // Set session_id to the active session for any existing rows
      await conn.query(`UPDATE tbl_timetables SET session_id = (SELECT id FROM tbl_academic_sessions WHERE is_active = 1 LIMIT 1) WHERE session_id IS NULL`);
      console.log('Updated existing rows with active session_id.');
    }
    console.log('Migration complete!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await conn.end();
  }
})();
