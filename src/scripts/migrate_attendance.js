/**
 * Academic Module — Student Attendance Migration
 * Creates tbl_student_attendance.
 *
 * Run: node src/scripts/migrate_attendance.js
 */

const { connectDb } = require('../utils/mysql');

const migrations = [
  {
    name: 'Create tbl_student_attendance',
    sql: `CREATE TABLE IF NOT EXISTS tbl_student_attendance (
      id INT PRIMARY KEY AUTO_INCREMENT,
      school_id INT NOT NULL,
      session_id INT NOT NULL,
      section_id INT NOT NULL,
      student_id INT NOT NULL,
      subject_id INT NULL,
      teacher_id INT NULL,
      date DATE NOT NULL,
      period INT NOT NULL DEFAULT 1,
      status ENUM('PRESENT', 'ABSENT', 'LATE', 'LEAVE') NOT NULL DEFAULT 'PRESENT',
      remarks VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_stud_att_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
      CONSTRAINT fk_stud_att_session FOREIGN KEY (session_id) REFERENCES tbl_academic_sessions(id) ON DELETE CASCADE,
      CONSTRAINT fk_stud_att_section FOREIGN KEY (section_id) REFERENCES tbl_sections(id) ON DELETE CASCADE,
      CONSTRAINT fk_stud_att_student FOREIGN KEY (student_id) REFERENCES tbl_students(id) ON DELETE CASCADE,
      CONSTRAINT fk_stud_att_subject FOREIGN KEY (subject_id) REFERENCES tbl_subjects(id) ON DELETE SET NULL,
      CONSTRAINT fk_stud_att_teacher FOREIGN KEY (teacher_id) REFERENCES tbl_teachers(id) ON DELETE SET NULL,
      UNIQUE KEY uk_student_period_date (student_id, date, period),
      INDEX idx_stud_att_date_section (school_id, date, section_id),
      INDEX idx_stud_att_student (school_id, student_id)
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

    console.log('\n🎉 Attendance migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
};

runMigrations();
