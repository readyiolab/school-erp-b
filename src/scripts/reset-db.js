require('../config/dotenv');

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const schemaPath = path.resolve(__dirname, '../../database/schema.sql');

const resetDatabase = async () => {
  const { dbHost, dbName, dbPass, dbUser } = require('../config/dotenv');

  // First, connect without database to create it if needed
  const tempConnection = await mysql.createConnection({
    host: dbHost,
    user: dbUser,
    password: dbPass || '',
  });

  try {
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`Database ${dbName} ensured.`);
  } catch (err) {
    console.error('Error creating database:', err.message);
    throw err;
  } finally {
    await tempConnection.end();
  }

  // Now connect to the database
  const pool = mysql.createPool({
    host: dbHost,
    user: dbUser,
    password: dbPass || '',
    database: dbName,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
  });

  const connection = await pool.getConnection();

  try {
    // Get all table names
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);

    if (tableNames.length > 0) {
      // Disable foreign key checks
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');

      // Drop all tables
      for (const table of tableNames) {
        await connection.query(`DROP TABLE IF EXISTS \`${table}\``);
        console.log(`Dropped table: ${table}`);
      }

      // Re-enable foreign key checks
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    // Read and execute schema.sql
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    const statements = schemaSql.split(';').filter(stmt => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        await connection.query(statement);
      }
    }

    console.log('Database reset and schema applied successfully!');
  } catch (err) {
    console.error('Error resetting database:', err.message);
    throw err;
  } finally {
    connection.release();
    await pool.end();
  }
};

resetDatabase().catch(console.error);