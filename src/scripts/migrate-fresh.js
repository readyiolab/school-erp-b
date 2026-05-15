require('../config/dotenv');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { registerAdmin } = require('../modules/auth/service');
const { disconnect } = require('../utils/mysql');

const schemaPath = path.resolve(__dirname, '../../database/schema.sql');

const migrateFresh = async () => {
  const { dbHost, dbName, dbPass, dbUser } = require('../config/dotenv');

  console.log('--- Starting Fresh Database Migration ---');

  // 1. Connect without database to ensure it exists
  const tempConnection = await mysql.createConnection({
    host: dbHost,
    user: dbUser,
    password: dbPass || '',
  });

  try {
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`Database "${dbName}" ensured.`);
  } catch (err) {
    console.error('Error creating database:', err.message);
    throw err;
  } finally {
    await tempConnection.end();
  }

  // 2. Connect to the database
  const pool = mysql.createPool({
    host: dbHost,
    user: dbUser,
    password: dbPass || '',
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  const connection = await pool.getConnection();

  try {
    // 3. Drop all existing tables
    console.log('Dropping existing tables...');
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);

    if (tableNames.length > 0) {
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const table of tableNames) {
        await connection.query(`DROP TABLE IF EXISTS \`${table}\``);
        console.log(`  Dropped table: ${table}`);
      }
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    }
    console.log('All tables dropped.');

    // 4. Apply schema.sql
    console.log('Applying schema.sql...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    // Split by semicolon but handle potential semicolons inside strings or comments if any
    // For simplicity, we'll use a regex that matches semicolon at end of line
    const statements = schemaSql.split(/;\s*$/m).filter(stmt => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        await connection.query(statement);
      }
    }
    console.log('Schema applied successfully.');

    // 5. Run additional migrations/upgrades if any (syncing with migrate.js logic)
    console.log('Running additional upgrades...');
    // Currently schema.sql is mostly up to date, but we can ensure specific ENUMs or columns here
    // Example from migrate.js: Update ENUM for tbl_admins -> role
    await connection.query(`
      ALTER TABLE tbl_admins 
      MODIFY COLUMN role ENUM('ADMIN', 'TEACHER', 'STUDENT', 'STAFF') NOT NULL DEFAULT 'ADMIN'
    `);
    console.log('Upgrades completed.');

    // 6. Register Default Admin
    console.log('Registering default admin...');
    const adminDetails = {
      fullName: 'Surya Admin',
      email: 'psurya162@gmail.com',
      password: 'Alok@123',
      schoolCode: 'ALOK001'
    };

    // We use the service to handle hashing and school creation
    const admin = await registerAdmin(adminDetails);
    console.log('Default admin created:');
    console.log(`  Email: ${admin.email}`);
    console.log(`  School: ${admin.schoolName} (${adminDetails.schoolCode})`);

    console.log('\n--- Fresh Migration Completed Successfully ---');
  } catch (err) {
    console.error('\n--- Fresh Migration Failed ---');
    console.error(err.message);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
    await disconnect(); // Disconnect the utility pool used by registerAdmin
  }
};

migrateFresh().catch(err => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});
