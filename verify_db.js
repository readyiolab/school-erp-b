const { query, disconnect } = require('./src/utils/mysql');
require('./src/config/dotenv');

async function verify() {
  try {
    const schools = await query('SELECT * FROM tbl_schools WHERE code = ?', ['SCH001']);
    console.log('Schools:', JSON.stringify(schools, null, 2));

    const admins = await query('SELECT id, email, full_name, school_id FROM tbl_admins WHERE email = ?', ['alok@example.com']);
    console.log('Admins:', JSON.stringify(admins, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await disconnect();
  }
}

verify();
