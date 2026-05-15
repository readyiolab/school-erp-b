const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Starting migration for tbl_schools...');
        
        const [rows] = await conn.query('SHOW COLUMNS FROM tbl_schools');
        const names = rows.map(r => r.Field);

        if (!names.includes('student_sequence')) {
            await conn.query('ALTER TABLE tbl_schools ADD COLUMN student_sequence INT DEFAULT 0 AFTER code');
            console.log('Added student_sequence column');
        } else {
            console.log('student_sequence column already exists.');
        }

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error.message);
    } finally {
        await conn.end();
    }
}

migrate();
