/**
 * Academic Module — Holidays & Leave Management Migration
 * Creates tbl_holidays and tbl_leave_requests.
 *
 * Run: node src/scripts/migrate_leaves.js
 */

const { connectDb } = require('../utils/mysql');

const migrations = [
  {
    name: 'Create tbl_holidays',
    sql: `CREATE TABLE IF NOT EXISTS tbl_holidays (
      id INT PRIMARY KEY AUTO_INCREMENT,
      school_id INT NOT NULL,
      session_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT NULL,
      holiday_date DATE NOT NULL,
      is_half_day TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_holidays_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
      CONSTRAINT fk_holidays_session FOREIGN KEY (session_id) REFERENCES tbl_academic_sessions(id) ON DELETE CASCADE,
      UNIQUE KEY uk_holiday_school_date (school_id, holiday_date)
    )`
  },
  {
    name: 'Create tbl_leave_requests',
    sql: `CREATE TABLE IF NOT EXISTS tbl_leave_requests (
      id INT PRIMARY KEY AUTO_INCREMENT,
      school_id INT NOT NULL,
      student_id INT NOT NULL,
      session_id INT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      reason VARCHAR(255) NOT NULL,
      letter_content TEXT NULL,
      status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
      approved_by INT NULL,
      teacher_note TEXT NULL,
      is_half_day TINYINT(1) DEFAULT 0,
      half_day_type ENUM('MORNING', 'AFTERNOON') NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_leaves_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
      CONSTRAINT fk_leaves_student FOREIGN KEY (student_id) REFERENCES tbl_students(id) ON DELETE CASCADE,
      CONSTRAINT fk_leaves_session FOREIGN KEY (session_id) REFERENCES tbl_academic_sessions(id) ON DELETE CASCADE,
      CONSTRAINT fk_leaves_approver FOREIGN KEY (approved_by) REFERENCES tbl_admins(id) ON DELETE SET NULL
    )`
  }
];

const runMigrations = async () => {
  try {
    const pool = await connectDb();

    for (const migration of migrations) {
      try {
        await pool.query(migration.sql);
        console.log(`✅ ${migration.name}`);
      } catch (err) {
        console.error(`❌ ${migration.name}:`, err.message);
      }
    }

    console.log('\n🎉 Leave & Holiday migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
};

runMigrations();
