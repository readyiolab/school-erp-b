const mysql = require('mysql2/promise');
const { dbHost, dbName, dbPass, dbUser } = require('../config/dotenv');

let pool;

const connectDb = async () => {
  if (pool) return pool;

  pool = mysql.createPool({
    host: dbHost,
    user: dbUser,
    password: dbPass,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : null
  });

  try {
    const connection = await pool.getConnection();
    console.log('Connected to MySQL successfully!');
    connection.release();
    return pool;
  } catch (err) {
    console.error('Database Connectivity Error:', err.message);
    throw new Error(`Database Connectivity Error: ${err.message}`);
  }
};

const select = async (tblName, column = '*', where = '', params = [], print = false) => {
  if (!pool) await connectDb();
  const wr = where ? `WHERE ${where}` : '';
  const sql = `SELECT ${column} FROM ${tblName} ${wr}`;
  if (print) console.log(sql, params);

  try {
    const [results] = await pool.query(sql, params);
    return results[0];
  } catch (err) {
    console.error('Select Error:', err.message);
    throw new Error(`Select Error: ${err.message}`);
  }
};

const selectAll = async (
  tblName,
  column = '*',
  where = '',
  params = [],
  orderby = '',
  print = false
) => {
  if (!pool) await connectDb();
  const wr = where ? `WHERE ${where}` : '';
  const sql = `SELECT ${column} FROM ${tblName} ${wr} ${orderby}`;
  if (print) console.log(sql, params);

  try {
    const [results] = await pool.query(sql, params);
    return results;
  } catch (err) {
    console.error('Select All Error:', err.message);
    throw new Error(`Select All Error: ${err.message}`);
  }
};

const insert = async (tblName, data, print = false) => {
  if (!pool) await connectDb();
  const sql = `INSERT INTO ${tblName} SET ?`;
  if (print) console.log(sql, data);

  try {
    const [result] = await pool.query(sql, data);
    return {
      status: true,
      insert_id: result.insertId,
      affected_rows: result.affectedRows,
      info: result.info
    };
  } catch (err) {
    console.error('Insert Error:', err.message);
    throw new Error(`Insert Error: ${err.message}`);
  }
};

const update = async (tableName, formData, where = '', params = [], print = false) => {
  if (!pool) await connectDb();
  const whereSQL = where ? ` WHERE ${where}` : '';
  const sql = `UPDATE ${tableName} SET ? ${whereSQL}`;
  if (print) console.log(sql, [formData, ...params]);

  try {
    const [result] = await pool.query(sql, [formData, ...params]);
    return {
      status: true,
      affected_rows: result.affectedRows,
      info: result.info
    };
  } catch (err) {
    console.error('Update Error:', err.message);
    throw new Error(`Update Error: ${err.message}`);
  }
};

const deleteRow = async (tblName, where = '', params = [], print = false) => {
  if (!pool) await connectDb();
  const whereSQL = where ? ` WHERE ${where}` : '';
  const sql = `DELETE FROM ${tblName} ${whereSQL}`;
  if (print) console.log(sql, params);

  try {
    const [result] = await pool.query(sql, params);
    return {
      status: true,
      info: result.info
    };
  } catch (err) {
    console.error('Delete Error:', err.message);
    throw new Error(`Delete Error: ${err.message}`);
  }
};

const query = async (sql, params = [], print = false) => {
  if (!pool) await connectDb();
  if (print) console.log(sql, params);

  try {
    const [results] = await pool.query(sql, params);
    return results[0];
  } catch (err) {
    console.error('Query Error:', err.message);
    throw new Error(`Query Error: ${err.message}`);
  }
};

const queryAll = async (sql, params = [], print = false) => {
  if (!pool) await connectDb();
  if (print) console.log(sql, params);

  try {
    const [results] = await pool.query(sql, params);
    return results;
  } catch (err) {
    console.error('Query All Error:', err.message);
    throw new Error(`Query All Error: ${err.message}`);
  }
};

const insertAll = async (sql, params = [], print = false) => {
  if (!pool) await connectDb();
  if (print) console.log(sql, params);

  try {
    const [result] = await pool.query(sql, params);
    return {
      status: true,
      insert_id: result.insertId,
      affected_rows: result.affectedRows,
      info: result.info
    };
  } catch (err) {
    console.error('Insert All Error:', err.message);
    throw new Error(`Insert All Error: ${err.message}`);
  }
};

const isHealthy = async () => {
  try {
    if (!pool) await connectDb();
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    return false;
  }
};

const disconnect = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

module.exports = {
  connectDb,
  select,
  selectAll,
  insert,
  update,
  delete: deleteRow,
  deleteRow,
  query,
  queryAll,
  insertAll,
  isHealthy,
  disconnect,
  connect: connectDb
};
