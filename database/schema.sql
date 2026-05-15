-- =============================================
-- School ERP — Complete Database Schema
-- =============================================

-- 1. Schools (master)
CREATE TABLE IF NOT EXISTS tbl_schools (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) NOT NULL UNIQUE,
  address TEXT NULL,
  logo_url TEXT NULL,
  receipt_sequence INT NOT NULL DEFAULT 0,
  student_sequence INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Admins
CREATE TABLE IF NOT EXISTS tbl_admins (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(100) NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'TEACHER', 'STUDENT', 'STAFF') NOT NULL DEFAULT 'ADMIN',
  profile_id INT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tbl_admins_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
  INDEX idx_admin_school_id (school_id),
  INDEX idx_admin_username (username)
);

-- 3. Classes (master per school)
CREATE TABLE IF NOT EXISTS tbl_classes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  name VARCHAR(50) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  has_streams TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tbl_classes_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
  UNIQUE KEY uk_class_school_name (school_id, name),
  INDEX idx_class_school (school_id)
);

-- 4. Sections (per class)
CREATE TABLE IF NOT EXISTS tbl_sections (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  class_id INT NOT NULL,
  name VARCHAR(50) NOT NULL DEFAULT 'A',
  max_capacity INT NOT NULL DEFAULT 40,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tbl_sections_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
  CONSTRAINT fk_tbl_sections_class FOREIGN KEY (class_id) REFERENCES tbl_classes(id) ON DELETE CASCADE,
  UNIQUE KEY uk_section_class_name (school_id, class_id, name),
  INDEX idx_section_school_class (school_id, class_id)
);

-- 5. Streams (for class 11 & 12)
CREATE TABLE IF NOT EXISTS tbl_streams (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  class_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tbl_streams_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
  CONSTRAINT fk_tbl_streams_class FOREIGN KEY (class_id) REFERENCES tbl_classes(id) ON DELETE CASCADE,
  UNIQUE KEY uk_stream_class_name (school_id, class_id, name),
  INDEX idx_stream_school_class (school_id, class_id)
);

-- 6. Students (enhanced)
CREATE TABLE IF NOT EXISTS tbl_students (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  student_uid VARCHAR(50) NULL,
  name VARCHAR(255) NOT NULL,
  class VARCHAR(50) NOT NULL,
  section VARCHAR(50) NOT NULL DEFAULT 'A',
  stream VARCHAR(100) NULL,
  admission_type VARCHAR(50) NULL,
  date_of_birth DATE NULL,
  gender ENUM('MALE', 'FEMALE', 'OTHER') NULL,
  address TEXT NULL,
  email VARCHAR(255) NULL,
  aadhaar_number VARCHAR(20) NULL,
  photo_url TEXT NULL,
  parent_name VARCHAR(255) NULL,
  phone VARCHAR(20) NULL,
  status ENUM('ACTIVE', 'INACTIVE', 'PROMOTED', 'ALUMNI') NOT NULL DEFAULT 'ACTIVE',
  admission_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tbl_students_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
  UNIQUE KEY uk_student_uid (student_uid),
  INDEX idx_student_school_class_section (school_id, class, section),
  INDEX idx_student_school_status (school_id, status),
  INDEX idx_student_school_phone (school_id, phone),
  INDEX idx_student_name (school_id, name),
  FULLTEXT INDEX ft_student_search (name, student_uid)
);

-- 7. Admissions (enhanced)
CREATE TABLE IF NOT EXISTS tbl_admissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  student_name VARCHAR(255) NOT NULL,
  class VARCHAR(50) NOT NULL,
  section VARCHAR(50) NULL,
  stream VARCHAR(100) NULL,
  admission_type VARCHAR(50) NULL DEFAULT 'REGULAR',
  date_of_birth DATE NULL,
  gender ENUM('MALE', 'FEMALE', 'OTHER') NULL,
  address TEXT NULL,
  email VARCHAR(255) NULL,
  aadhaar_number VARCHAR(20) NULL,
  photo_url TEXT NULL,
  transfer_certificate_url TEXT NULL,
  parent_name VARCHAR(255) NULL,
  phone VARCHAR(20) NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  approved_at DATETIME NULL,
  approved_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tbl_admissions_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
  INDEX idx_admission_school_status (school_id, status)
);

-- 8. Documents (student uploads)
CREATE TABLE IF NOT EXISTS tbl_documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  student_id INT NOT NULL,
  doc_type ENUM('PHOTO', 'AADHAAR', 'TRANSFER_CERTIFICATE', 'OTHER') NOT NULL,
  file_url TEXT NOT NULL,
  original_name VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tbl_documents_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
  CONSTRAINT fk_tbl_documents_student FOREIGN KEY (student_id) REFERENCES tbl_students(id) ON DELETE CASCADE,
  INDEX idx_documents_student (school_id, student_id)
);

-- 9. Fee Structures (templates)
CREATE TABLE IF NOT EXISTS tbl_fee_structures (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  fee_type ENUM('ADMISSION', 'TUITION', 'TRANSPORT', 'EXAM', 'OTHER') NOT NULL DEFAULT 'TUITION',
  frequency ENUM('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'YEARLY') NOT NULL DEFAULT 'MONTHLY',
  amount DECIMAL(10, 2) NOT NULL,
  fine_per_day DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  grace_period_days INT NOT NULL DEFAULT 5,
  applicable_classes TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tbl_fee_structures_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
  INDEX idx_fee_structure_school (school_id),
  INDEX idx_fee_structure_type (school_id, fee_type)
);

CREATE TABLE IF NOT EXISTS tbl_fee_structure_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  fee_structure_id INT NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tbl_fee_structure_items_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
  CONSTRAINT fk_tbl_fee_structure_items_structure FOREIGN KEY (fee_structure_id) REFERENCES tbl_fee_structures(id) ON DELETE CASCADE,
  INDEX idx_fee_structure_items_structure (school_id, fee_structure_id)
);

-- 10. Fee Assignments (fee assigned to a student)
CREATE TABLE IF NOT EXISTS tbl_fee_assignments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  student_id INT NOT NULL,
  fee_structure_id INT NOT NULL,
  fee_item_name VARCHAR(255) NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  discount_reason VARCHAR(255) NULL,
  net_amount DECIMAL(10, 2) NOT NULL,
  paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  due_date DATE NOT NULL,
  status ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE') NOT NULL DEFAULT 'PENDING',
  installment_count INT NOT NULL DEFAULT 1,
  academic_year VARCHAR(20) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tbl_fee_assign_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
  CONSTRAINT fk_tbl_fee_assign_student FOREIGN KEY (student_id) REFERENCES tbl_students(id) ON DELETE CASCADE,
  CONSTRAINT fk_tbl_fee_assign_structure FOREIGN KEY (fee_structure_id) REFERENCES tbl_fee_structures(id) ON DELETE CASCADE,
  INDEX idx_fee_assign_school_student (school_id, student_id),
  INDEX idx_fee_assign_status (school_id, status),
  INDEX idx_fee_assign_due (school_id, due_date)
);

-- 11. Fee Payments (individual transactions)
CREATE TABLE IF NOT EXISTS tbl_fee_payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  student_id INT NOT NULL,
  fee_assignment_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  late_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total_paid DECIMAL(10, 2) NOT NULL,
  payment_mode ENUM('CASH', 'ONLINE', 'UPI') NOT NULL DEFAULT 'CASH',
  transaction_ref VARCHAR(255) NULL,
  payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tbl_fee_pay_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
  CONSTRAINT fk_tbl_fee_pay_student FOREIGN KEY (student_id) REFERENCES tbl_students(id) ON DELETE CASCADE,
  CONSTRAINT fk_tbl_fee_pay_assignment FOREIGN KEY (fee_assignment_id) REFERENCES tbl_fee_assignments(id) ON DELETE CASCADE,
  INDEX idx_fee_pay_school_student (school_id, student_id),
  INDEX idx_fee_pay_date (school_id, payment_date)
);

-- 12. Legacy Fees (keep for backward compat)
CREATE TABLE IF NOT EXISTS tbl_fees (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  student_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status ENUM('PENDING', 'PAID', 'FAILED') NOT NULL DEFAULT 'PAID',
  payment_date DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tbl_fees_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
  CONSTRAINT fk_tbl_fees_student FOREIGN KEY (student_id) REFERENCES tbl_students(id) ON DELETE CASCADE,
  INDEX idx_fee_school_status (school_id, status),
  INDEX idx_fee_school_student (school_id, student_id)
);

-- 13. Receipts
CREATE TABLE IF NOT EXISTS tbl_receipts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  student_id INT NOT NULL,
  fee_id INT NULL,
  fee_payment_id INT NULL,
  receipt_number VARCHAR(100) NOT NULL UNIQUE,
  amount DECIMAL(10, 2) NULL,
  pdf_url TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tbl_receipts_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
  CONSTRAINT fk_tbl_receipts_student FOREIGN KEY (student_id) REFERENCES tbl_students(id) ON DELETE CASCADE,
  INDEX idx_receipt_school_student (school_id, student_id)
);

CREATE TABLE IF NOT EXISTS tbl_receipt_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  receipt_id INT NOT NULL,
  fee_assignment_id INT NULL,
  item_name VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tbl_receipt_items_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
  CONSTRAINT fk_tbl_receipt_items_receipt FOREIGN KEY (receipt_id) REFERENCES tbl_receipts(id) ON DELETE CASCADE,
  INDEX idx_receipt_items_receipt (school_id, receipt_id)
);

-- 14. ID Cards
CREATE TABLE IF NOT EXISTS tbl_id_cards (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  student_id INT NOT NULL,
  card_url TEXT NULL,
  qr_data TEXT NULL,
  academic_year VARCHAR(20) NULL,
  generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tbl_id_cards_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
  CONSTRAINT fk_tbl_id_cards_student FOREIGN KEY (student_id) REFERENCES tbl_students(id) ON DELETE CASCADE,
  UNIQUE KEY uk_id_card_student_year (school_id, student_id, academic_year),
  INDEX idx_id_card_school (school_id)
);

-- 15. Promotions
CREATE TABLE IF NOT EXISTS tbl_promotions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  student_id INT NOT NULL,
  from_class VARCHAR(50) NOT NULL,
  from_section VARCHAR(50) NULL,
  to_class VARCHAR(50) NOT NULL,
  to_section VARCHAR(50) NULL,
  academic_year VARCHAR(20) NOT NULL,
  promoted_by INT NULL,
  promoted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tbl_promotions_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
  CONSTRAINT fk_tbl_promotions_student FOREIGN KEY (student_id) REFERENCES tbl_students(id) ON DELETE CASCADE,
  INDEX idx_promotion_school_year (school_id, academic_year)
);

-- 16. Audit Logs
CREATE TABLE IF NOT EXISTS tbl_audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  admin_id INT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT NULL,
  details JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tbl_audit_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
  INDEX idx_audit_school_action (school_id, action),
  INDEX idx_audit_school_entity (school_id, entity_type, entity_id),
  INDEX idx_audit_created (school_id, created_at)
);

-- =============================================
-- ACADEMIC MANAGEMENT MODULE 
-- =============================================

-- 17. Academic Sessions
CREATE TABLE IF NOT EXISTS tbl_academic_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  name VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
  UNIQUE KEY uk_session_school_name (school_id, name)
);

-- 18. Teachers Profile (Links to tbl_admins)
CREATE TABLE IF NOT EXISTS tbl_teachers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  admin_id INT NOT NULL,
  employee_uid VARCHAR(50) NULL,
  qualifications VARCHAR(255) NULL,
  joining_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_teachers_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
  CONSTRAINT fk_teachers_admin FOREIGN KEY (admin_id) REFERENCES tbl_admins(id) ON DELETE CASCADE,
  UNIQUE KEY uk_teacher_admin (admin_id)
);

-- 19. Subjects
CREATE TABLE IF NOT EXISTS tbl_subjects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,
  is_practical TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_subjects_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE
);

-- 20. Class Subjects
CREATE TABLE IF NOT EXISTS tbl_class_subjects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  class_id INT NOT NULL,
  subject_id INT NOT NULL,
  theory_max_marks DECIMAL(5,2) DEFAULT 80.00,
  practical_max_marks DECIMAL(5,2) DEFAULT 20.00,
  CONSTRAINT fk_cs_class FOREIGN KEY (class_id) REFERENCES tbl_classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_cs_subject FOREIGN KEY (subject_id) REFERENCES tbl_subjects(id) ON DELETE CASCADE,
  UNIQUE KEY uk_class_subject (class_id, subject_id)
);

-- 21. Class Teachers
CREATE TABLE IF NOT EXISTS tbl_class_teachers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  section_id INT NOT NULL,
  teacher_id INT NOT NULL,
  CONSTRAINT fk_ct_section FOREIGN KEY (section_id) REFERENCES tbl_sections(id) ON DELETE CASCADE,
  CONSTRAINT fk_ct_teacher FOREIGN KEY (teacher_id) REFERENCES tbl_teachers(id) ON DELETE CASCADE,
  UNIQUE KEY uk_class_teacher_section (section_id)
);

-- 22. Teacher Subject Assignments
CREATE TABLE IF NOT EXISTS tbl_teacher_assignments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL,
  teacher_id INT NOT NULL,
  section_id INT NOT NULL,
  subject_id INT NOT NULL,
  CONSTRAINT fk_ta_session FOREIGN KEY (session_id) REFERENCES tbl_academic_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_ta_teacher FOREIGN KEY (teacher_id) REFERENCES tbl_teachers(id) ON DELETE CASCADE,
  CONSTRAINT fk_ta_section FOREIGN KEY (section_id) REFERENCES tbl_sections(id) ON DELETE CASCADE,
  CONSTRAINT fk_ta_subject FOREIGN KEY (subject_id) REFERENCES tbl_subjects(id) ON DELETE CASCADE,
  UNIQUE KEY uk_assignment_unique (session_id, section_id, subject_id)
);

-- 23. Timetables
CREATE TABLE IF NOT EXISTS tbl_timetables (
  id INT PRIMARY KEY AUTO_INCREMENT,
  section_id INT NOT NULL,
  teacher_id INT NOT NULL,
  subject_id INT NOT NULL,
  day_of_week TINYINT NOT NULL, -- 1=Mon, 2=Tue...
  period INT NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  CONSTRAINT fk_tt_section FOREIGN KEY (section_id) REFERENCES tbl_sections(id) ON DELETE CASCADE,
  CONSTRAINT fk_tt_teacher FOREIGN KEY (teacher_id) REFERENCES tbl_teachers(id) ON DELETE CASCADE,
  CONSTRAINT fk_tt_subject FOREIGN KEY (subject_id) REFERENCES tbl_subjects(id) ON DELETE CASCADE,
  UNIQUE KEY uk_teacher_time (teacher_id, day_of_week, period),
  UNIQUE KEY uk_section_time (section_id, day_of_week, period)
);

-- 24. Exams
CREATE TABLE IF NOT EXISTS tbl_exams (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  session_id INT NOT NULL,
  class_id INT NULL, -- NULL means all classes (Term Exam)
  name VARCHAR(100) NOT NULL,
  type ENUM('TERM', 'SUBJECT') NOT NULL DEFAULT 'TERM',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_exams_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
  CONSTRAINT fk_exams_session FOREIGN KEY (session_id) REFERENCES tbl_academic_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_exams_class FOREIGN KEY (class_id) REFERENCES tbl_classes(id) ON DELETE SET NULL
);

-- 25. Marks
CREATE TABLE IF NOT EXISTS tbl_marks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL,
  exam_id INT NOT NULL,
  student_id INT NOT NULL,
  subject_id INT NOT NULL,
  teacher_id INT NOT NULL,
  theory_marks DECIMAL(5,2) NULL,
  practical_marks DECIMAL(5,2) NULL,
  is_absent TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_marks_session FOREIGN KEY (session_id) REFERENCES tbl_academic_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_marks_exam FOREIGN KEY (exam_id) REFERENCES tbl_exams(id) ON DELETE CASCADE,
  CONSTRAINT fk_marks_student FOREIGN KEY (student_id) REFERENCES tbl_students(id) ON DELETE CASCADE,
  CONSTRAINT fk_marks_subject FOREIGN KEY (subject_id) REFERENCES tbl_subjects(id) ON DELETE CASCADE,
  CONSTRAINT fk_marks_teacher FOREIGN KEY (teacher_id) REFERENCES tbl_teachers(id) ON DELETE CASCADE,
  UNIQUE KEY uk_student_exam_subject (exam_id, student_id, subject_id)
);

-- 26. Marks Status
CREATE TABLE IF NOT EXISTS tbl_marks_status (
  id INT PRIMARY KEY AUTO_INCREMENT,
  exam_id INT NOT NULL,
  section_id INT NOT NULL,
  subject_id INT NOT NULL,
  is_completed TINYINT(1) DEFAULT 0,
  completed_at DATETIME NULL,
  CONSTRAINT fk_ms_exam FOREIGN KEY (exam_id) REFERENCES tbl_exams(id) ON DELETE CASCADE,
  CONSTRAINT fk_ms_section FOREIGN KEY (section_id) REFERENCES tbl_sections(id) ON DELETE CASCADE,
  CONSTRAINT fk_ms_subject FOREIGN KEY (subject_id) REFERENCES tbl_subjects(id) ON DELETE CASCADE,
  UNIQUE KEY uk_marks_status (exam_id, section_id, subject_id)
);

-- 27. Report Cards
CREATE TABLE IF NOT EXISTS tbl_report_cards (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  exam_id INT NOT NULL,
  total_marks DECIMAL(8,2) NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  grade VARCHAR(5) NOT NULL,
  pdf_path TEXT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rc_student FOREIGN KEY (student_id) REFERENCES tbl_students(id) ON DELETE CASCADE,
  CONSTRAINT fk_rc_exam FOREIGN KEY (exam_id) REFERENCES tbl_exams(id) ON DELETE CASCADE,
  UNIQUE KEY uk_student_report (student_id, exam_id)
);

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
