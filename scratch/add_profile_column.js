require('../src/config/dotenv');
const { connectDb, disconnect } = require('../src/utils/mysql');

async function run() {
  const pool = await connectDb();
  const connection = await pool.getConnection();
  try {
    // Add profile_id to link to tbl_students or tbl_teachers
    await connection.query('ALTER TABLE tbl_admins ADD COLUMN profile_id INT NULL AFTER role');
    console.log('Added profile_id column to tbl_admins');
  } catch (err) {
    if (err.code === 'ER_DUP_COLUMN_NAME') {
      console.log('Column profile_id already exists');
    } else {
      console.error(err);
    }
  } finally {
    connection.release();
    await disconnect();
  }
}

run();
