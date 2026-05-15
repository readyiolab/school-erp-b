const { connectDb, disconnect } = require("../utils/mysql");

const studentColumns = [
  `ALTER TABLE tbl_students ADD COLUMN IF NOT EXISTS student_uid VARCHAR(50) NULL`,
  `ALTER TABLE tbl_students ADD COLUMN IF NOT EXISTS stream VARCHAR(100) NULL`,
  `ALTER TABLE tbl_students ADD COLUMN IF NOT EXISTS admission_type VARCHAR(50) NULL`,
  `ALTER TABLE tbl_students ADD COLUMN IF NOT EXISTS date_of_birth DATE NULL`,
  `ALTER TABLE tbl_students ADD COLUMN IF NOT EXISTS gender ENUM('MALE','FEMALE','OTHER') NULL`,
  `ALTER TABLE tbl_students ADD COLUMN IF NOT EXISTS address TEXT NULL`,
  `ALTER TABLE tbl_students ADD COLUMN IF NOT EXISTS email VARCHAR(255) NULL`,
  `ALTER TABLE tbl_students ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(20) NULL`,
  `ALTER TABLE tbl_students ADD COLUMN IF NOT EXISTS photo_url TEXT NULL`,
  `ALTER TABLE tbl_students ADD COLUMN IF NOT EXISTS status ENUM('ACTIVE','INACTIVE','PROMOTED','ALUMNI') NOT NULL DEFAULT 'ACTIVE'`,
  `ALTER TABLE tbl_students ADD COLUMN IF NOT EXISTS admission_id INT NULL`,
  `ALTER TABLE tbl_students ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`,
  `ALTER TABLE tbl_students ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
  `ALTER TABLE tbl_students ADD UNIQUE INDEX IF NOT EXISTS uk_student_uid (student_uid)`,
  `ALTER TABLE tbl_students ADD INDEX IF NOT EXISTS idx_student_school_class_section (school_id, class, section)`,
  `ALTER TABLE tbl_students ADD INDEX IF NOT EXISTS idx_student_school_status (school_id, status)`,
  `ALTER TABLE tbl_students ADD INDEX IF NOT EXISTS idx_student_school_phone (school_id, phone)`,
  `ALTER TABLE tbl_students ADD INDEX IF NOT EXISTS idx_student_name (school_id, name)`,
  `ALTER TABLE tbl_students ADD FULLTEXT INDEX IF NOT EXISTS ft_student_search (name, student_uid)`
];

const run = async () => {
  const pool = await connectDb();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    for (const statement of studentColumns) {
      console.log("Executing:", statement);
      await conn.query(statement);
    }
    await conn.commit();
    console.log("Schema ensure completed.");
  } catch (error) {
    await conn.rollback();
    console.error("Schema ensure failed:", error.message);
    process.exitCode = 1;
  } finally {
    conn.release();
    await disconnect();
  }
};

run().catch((error) => {
  console.error("Schema ensure boot failed:", error.message);
  process.exit(1);
});
