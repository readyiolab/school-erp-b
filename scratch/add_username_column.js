require('../src/config/dotenv');
const { connectDb, disconnect } = require('../src/utils/mysql');

async function run() {
  const pool = await connectDb();
  const connection = await pool.getConnection();
  try {
    await connection.query('ALTER TABLE tbl_admins ADD COLUMN username VARCHAR(100) NULL UNIQUE AFTER email');
    console.log('Added username column to tbl_admins');
  } catch (err) {
    if (err.code === 'ER_DUP_COLUMN_NAME') {
      console.log('Column username already exists');
    } else {
      console.error(err);
    }
  } finally {
    connection.release();
    await disconnect();
  }
}

run();
