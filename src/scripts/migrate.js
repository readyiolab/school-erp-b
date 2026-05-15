require('../config/dotenv');

const fs = require('fs');
const path = require('path');
const { connectDb, disconnect } = require('../utils/mysql');

const schemaPath = path.resolve(__dirname, '../../database/schema.sql');

const getExistingColumns = async (connection, tableName) => {
  const [rows] = await connection.query(`SHOW COLUMNS FROM \`${tableName}\``);
  return new Set(rows.map((r) => r.Field));
};

const getExistingIndexes = async (connection, tableName) => {
  const [rows] = await connection.query(`SHOW INDEX FROM \`${tableName}\``);
  return new Set(rows.map((r) => r.Key_name));
};

const ensureColumn = async (connection, tableName, columnName, definition) => {
  const cols = await getExistingColumns(connection, tableName);
  if (cols.has(columnName)) return;
  await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
};

const ensureIndex = async (connection, tableName, indexName, definitionSql) => {
  const idx = await getExistingIndexes(connection, tableName);
  if (idx.has(indexName)) return;
  await connection.query(`ALTER TABLE \`${tableName}\` ADD ${definitionSql}`);
};

const ensureSchemaUpgrades = async (connection) => {
  // These upgrades are required because CREATE TABLE IF NOT EXISTS does not
  // modify older tables. Many API queries depend on these columns/indexes.
  await ensureColumn(connection, 'tbl_admins', 'role', "ENUM('ADMIN', 'TEACHER') NOT NULL DEFAULT 'ADMIN'");
  await ensureColumn(connection, 'tbl_students', 'student_uid', 'VARCHAR(50) NULL');
  await ensureColumn(
    connection,
    'tbl_students',
    'status',
    "ENUM('ACTIVE','INACTIVE','PROMOTED','ALUMNI') NOT NULL DEFAULT 'ACTIVE'"
  );
  await ensureColumn(connection, 'tbl_students', 'stream', 'VARCHAR(100) NULL');
  await ensureColumn(connection, 'tbl_students', 'admission_type', 'VARCHAR(50) NULL');
  await ensureColumn(connection, 'tbl_students', 'date_of_birth', 'DATE NULL');
  await ensureColumn(connection, 'tbl_students', 'gender', "ENUM('MALE','FEMALE','OTHER') NULL");
  await ensureColumn(connection, 'tbl_students', 'address', 'TEXT NULL');
  await ensureColumn(connection, 'tbl_students', 'email', 'VARCHAR(255) NULL');
  await ensureColumn(connection, 'tbl_students', 'aadhaar_number', 'VARCHAR(20) NULL');
  await ensureColumn(connection, 'tbl_students', 'photo_url', 'TEXT NULL');
  await ensureColumn(connection, 'tbl_students', 'admission_id', 'INT NULL');
  await ensureColumn(connection, 'tbl_students', 'created_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
  await ensureColumn(
    connection,
    'tbl_students',
    'updated_at',
    'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
  );

  await ensureIndex(connection, 'tbl_students', 'uk_student_uid', 'UNIQUE INDEX `uk_student_uid` (`student_uid`)');
  await ensureIndex(
    connection,
    'tbl_students',
    'idx_student_school_status',
    'INDEX `idx_student_school_status` (`school_id`, `status`)'
  );

  await ensureColumn(
    connection,
    'tbl_admissions',
    'status',
    "ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING'"
  );
  await ensureColumn(connection, 'tbl_admissions', 'approved_at', 'DATETIME NULL');
  await ensureColumn(connection, 'tbl_admissions', 'approved_by', 'INT NULL');
  await ensureIndex(
    connection,
    'tbl_admissions',
    'idx_admission_school_status',
    'INDEX `idx_admission_school_status` (`school_id`, `status`)'
  );

  await ensureColumn(
    connection,
    'tbl_fee_assignments',
    'status',
    "ENUM('PENDING','PARTIAL','PAID','OVERDUE') NOT NULL DEFAULT 'PENDING'"
  );
  await ensureColumn(connection, 'tbl_fee_assignments', 'net_amount', 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00');
  await ensureColumn(connection, 'tbl_fee_assignments', 'paid_amount', 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00');
  await ensureColumn(connection, 'tbl_fee_assignments', 'fee_item_name', 'VARCHAR(255) NULL');
  await ensureIndex(
    connection,
    'tbl_fee_assignments',
    'idx_fee_assign_status',
    'INDEX `idx_fee_assign_status` (`school_id`, `status`)'
  );

  // Receipt support for new fee system (optional on older DBs)
  await ensureColumn(connection, 'tbl_receipts', 'fee_payment_id', 'INT NULL');
  await ensureColumn(connection, 'tbl_receipts', 'amount', 'DECIMAL(10, 2) NULL');
  await connection.query(`
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
    )
  `);
  await connection.query(`
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
    )
  `);
};

const runMigration = async () => {
  const sql = fs.readFileSync(schemaPath, 'utf8').trim();

  if (!sql) {
    throw new Error('Schema file is empty');
  }

  const pool = await connectDb();
  const connection = await pool.getConnection();

  try {
    const statements = sql
      .split(/;\s*$/m)
      .map((statement) => statement.trim())
      .filter(Boolean);

    await connection.beginTransaction();

    for (const statement of statements) {
      await connection.query(statement);
    }

    // Upgrade existing tables so APIs don't fail on older schemas.
    await ensureSchemaUpgrades(connection);

    await connection.commit();
    console.log('Checked JSON support.');

    // Update ENUM for tbl_admins -> role
    console.log('Updating tbl_admins role ENUM...');
    await connection.query(`
      ALTER TABLE tbl_admins 
      MODIFY COLUMN role ENUM('ADMIN', 'TEACHER', 'STUDENT', 'STAFF') NOT NULL DEFAULT 'ADMIN';
    `);
    console.log('Successfully updated tbl_admins role ENUM added STUDENT and STAFF.');

    console.log(`Database migration completed successfully using ${schemaPath}`);
  } catch (error) {
    await connection.rollback();
    console.error('Database migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    connection.release();
    await disconnect();
  }
};

runMigration().catch(async (error) => {
  console.error('Migration bootstrap failed:', error.message);
  await disconnect();
  process.exit(1);
});
