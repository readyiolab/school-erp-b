-- =============================================
-- Migration: Add Attendance, Holidays, and Leaves
-- =============================================

-- 1. Holidays
CREATE TABLE IF NOT EXISTS tbl_holidays (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  holiday_date DATE NOT NULL,
  is_half_day TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_holidays_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
  UNIQUE KEY uk_school_date (school_id, holiday_date)
);

-- 2. Student Attendance
CREATE TABLE IF NOT EXISTS tbl_student_attendance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  session_id INT NOT NULL,
  section_id INT NOT NULL,
  student_id INT NOT NULL,
  subject_id INT NULL, -- NULL for general attendance (daily)
  teacher_id INT NULL,
  date DATE NOT NULL,
  period INT NOT NULL DEFAULT 1,
  status ENUM('PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'HALF_DAY') NOT NULL,
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_stu_att_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
  CONSTRAINT fk_stu_att_student FOREIGN KEY (student_id) REFERENCES tbl_students(id) ON DELETE CASCADE,
  UNIQUE KEY uk_student_date_period (student_id, date, period)
);

-- 3. Leave Requests
CREATE TABLE IF NOT EXISTS tbl_leave_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  student_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  is_half_day TINYINT(1) DEFAULT 0,
  half_day_type ENUM('MORNING', 'AFTERNOON') NULL,
  approved_by INT NULL, -- Admin ID
  rejection_reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_leaves_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
  CONSTRAINT fk_leaves_student FOREIGN KEY (student_id) REFERENCES tbl_students(id) ON DELETE CASCADE
);

-- 4. Teacher Attendance (Punch In/Out)
CREATE TABLE IF NOT EXISTS tbl_teacher_attendance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  teacher_id INT NOT NULL,
  date DATE NOT NULL,
  punch_in DATETIME NULL,
  punch_out DATETIME NULL,
  status ENUM('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY') NOT NULL DEFAULT 'PRESENT',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_teach_att_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
  CONSTRAINT fk_teach_att_teacher FOREIGN KEY (teacher_id) REFERENCES tbl_teachers(id) ON DELETE CASCADE,
  UNIQUE KEY uk_teacher_date (teacher_id, date)
);
