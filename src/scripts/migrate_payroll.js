/**
 * Payroll Module — Database Migration
 * Creates all payroll-related tables for the School ERP system.
 *
 * Run: node src/scripts/migrate_payroll.js
 */

const { connectDb } = require('../utils/mysql');

const migrations = [
  // Add employee_sequence to schools table
  {
    name: 'Add employee_sequence to tbl_schools',
    sql: `ALTER TABLE tbl_schools
          ADD COLUMN employee_sequence INT NOT NULL DEFAULT 0`
  },

  // 1. Salary Structures (templates — created before employees so FK works)
  {
    name: 'Create tbl_salary_structures',
    sql: `CREATE TABLE IF NOT EXISTS tbl_salary_structures (
      id INT PRIMARY KEY AUTO_INCREMENT,
      school_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_salary_struct_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
      INDEX idx_salary_struct_school (school_id),
      INDEX idx_salary_struct_active (school_id, is_active)
    )`
  },

  // 2. Salary Components (earnings & deductions per structure)
  {
    name: 'Create tbl_salary_components',
    sql: `CREATE TABLE IF NOT EXISTS tbl_salary_components (
      id INT PRIMARY KEY AUTO_INCREMENT,
      school_id INT NOT NULL,
      salary_structure_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      type ENUM('EARNING', 'DEDUCTION') NOT NULL,
      calc_type ENUM('FIXED', 'PERCENTAGE') NOT NULL DEFAULT 'FIXED',
      value DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      percentage_of VARCHAR(100) NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_salary_comp_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
      CONSTRAINT fk_salary_comp_structure FOREIGN KEY (salary_structure_id) REFERENCES tbl_salary_structures(id) ON DELETE CASCADE,
      INDEX idx_salary_comp_structure (school_id, salary_structure_id)
    )`
  },

  // 3. Employees
  {
    name: 'Create tbl_employees',
    sql: `CREATE TABLE IF NOT EXISTS tbl_employees (
      id INT PRIMARY KEY AUTO_INCREMENT,
      school_id INT NOT NULL,
      employee_uid VARCHAR(50) NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NULL,
      phone VARCHAR(20) NULL,
      role ENUM('TEACHER', 'ADMIN', 'STAFF') NOT NULL DEFAULT 'TEACHER',
      department VARCHAR(100) NULL,
      designation VARCHAR(100) NULL,
      joining_date DATE NULL,
      bank_name VARCHAR(255) NULL,
      bank_account VARCHAR(50) NULL,
      ifsc_code VARCHAR(20) NULL,
      pan_number VARCHAR(20) NULL,
      salary_structure_id INT NULL,
      status ENUM('ACTIVE', 'INACTIVE', 'TERMINATED') NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_emp_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
      CONSTRAINT fk_emp_salary_struct FOREIGN KEY (salary_structure_id) REFERENCES tbl_salary_structures(id) ON DELETE SET NULL,
      UNIQUE KEY uk_employee_uid (employee_uid),
      INDEX idx_emp_school_status (school_id, status),
      INDEX idx_emp_school_role (school_id, role),
      INDEX idx_emp_school_dept (school_id, department),
      FULLTEXT INDEX ft_emp_search (name, employee_uid)
    )`
  },

  // 4. Employee Attendance
  {
    name: 'Create tbl_employee_attendance',
    sql: `CREATE TABLE IF NOT EXISTS tbl_employee_attendance (
      id INT PRIMARY KEY AUTO_INCREMENT,
      school_id INT NOT NULL,
      employee_id INT NOT NULL,
      date DATE NOT NULL,
      status ENUM('PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY') NOT NULL DEFAULT 'PRESENT',
      leave_type ENUM('PAID', 'UNPAID', 'SICK', 'CASUAL') NULL,
      remarks VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_emp_att_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
      CONSTRAINT fk_emp_att_employee FOREIGN KEY (employee_id) REFERENCES tbl_employees(id) ON DELETE CASCADE,
      UNIQUE KEY uk_emp_att_date (school_id, employee_id, date),
      INDEX idx_emp_att_date (school_id, date),
      INDEX idx_emp_att_employee (school_id, employee_id)
    )`
  },

  // 5. Payroll Runs (monthly batch header)
  {
    name: 'Create tbl_payroll_runs',
    sql: `CREATE TABLE IF NOT EXISTS tbl_payroll_runs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      school_id INT NOT NULL,
      month INT NOT NULL,
      year INT NOT NULL,
      working_days INT NOT NULL DEFAULT 26,
      total_employees INT NOT NULL DEFAULT 0,
      total_gross DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
      total_deductions DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
      total_net DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
      status ENUM('DRAFT', 'PROCESSED', 'PAID') NOT NULL DEFAULT 'DRAFT',
      processed_by INT NULL,
      processed_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_payroll_run_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
      UNIQUE KEY uk_payroll_run_month (school_id, month, year),
      INDEX idx_payroll_run_school (school_id),
      INDEX idx_payroll_run_status (school_id, status)
    )`
  },

  // 6. Payroll Records (one per employee per run)
  {
    name: 'Create tbl_payroll_records',
    sql: `CREATE TABLE IF NOT EXISTS tbl_payroll_records (
      id INT PRIMARY KEY AUTO_INCREMENT,
      school_id INT NOT NULL,
      payroll_run_id INT NOT NULL,
      employee_id INT NOT NULL,
      working_days INT NOT NULL DEFAULT 0,
      present_days DECIMAL(5, 1) NOT NULL DEFAULT 0.0,
      leave_days DECIMAL(5, 1) NOT NULL DEFAULT 0.0,
      absent_days DECIMAL(5, 1) NOT NULL DEFAULT 0.0,
      base_salary DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      gross_salary DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      total_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      net_salary DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      payment_status ENUM('UNPAID', 'PAID') NOT NULL DEFAULT 'UNPAID',
      payment_date DATETIME NULL,
      payment_method ENUM('BANK', 'CASH', 'UPI') NULL,
      transaction_ref VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_payroll_rec_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
      CONSTRAINT fk_payroll_rec_run FOREIGN KEY (payroll_run_id) REFERENCES tbl_payroll_runs(id) ON DELETE CASCADE,
      CONSTRAINT fk_payroll_rec_emp FOREIGN KEY (employee_id) REFERENCES tbl_employees(id) ON DELETE CASCADE,
      UNIQUE KEY uk_payroll_rec_emp_run (school_id, payroll_run_id, employee_id),
      INDEX idx_payroll_rec_run (school_id, payroll_run_id),
      INDEX idx_payroll_rec_emp (school_id, employee_id),
      INDEX idx_payroll_rec_status (school_id, payment_status)
    )`
  },

  // 7. Payroll Line Items (earnings/deductions breakdown)
  {
    name: 'Create tbl_payroll_line_items',
    sql: `CREATE TABLE IF NOT EXISTS tbl_payroll_line_items (
      id INT PRIMARY KEY AUTO_INCREMENT,
      school_id INT NOT NULL,
      payroll_record_id INT NOT NULL,
      component_name VARCHAR(255) NOT NULL,
      type ENUM('EARNING', 'DEDUCTION') NOT NULL,
      amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_payroll_li_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
      CONSTRAINT fk_payroll_li_record FOREIGN KEY (payroll_record_id) REFERENCES tbl_payroll_records(id) ON DELETE CASCADE,
      INDEX idx_payroll_li_record (school_id, payroll_record_id)
    )`
  },

  // 8. Salary Increments (history tracking)
  {
    name: 'Create tbl_salary_increments',
    sql: `CREATE TABLE IF NOT EXISTS tbl_salary_increments (
      id INT PRIMARY KEY AUTO_INCREMENT,
      school_id INT NOT NULL,
      employee_id INT NOT NULL,
      old_structure_id INT NULL,
      new_structure_id INT NULL,
      effective_date DATE NOT NULL,
      reason VARCHAR(500) NULL,
      changed_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_sal_inc_school FOREIGN KEY (school_id) REFERENCES tbl_schools(id) ON DELETE CASCADE,
      CONSTRAINT fk_sal_inc_emp FOREIGN KEY (employee_id) REFERENCES tbl_employees(id) ON DELETE CASCADE,
      INDEX idx_sal_inc_emp (school_id, employee_id)
    )`
  },

  // 9. Add date_of_birth to tbl_employees
  {
    name: 'Add date_of_birth to tbl_employees',
    sql: `ALTER TABLE tbl_employees
          ADD COLUMN date_of_birth DATE NULL AFTER designation`
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
        // Skip "duplicate column" errors for ALTER TABLE
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`⏭️  ${migration.name} (column already exists)`);
        } else {
          console.error(`❌ ${migration.name}:`, err.message);
        }
      }
    }

    console.log('\n🎉 Payroll migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
};

runMigrations();
