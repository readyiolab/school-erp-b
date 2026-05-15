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
        console.log('Comprehensive migration for tbl_students...');
        
        const [rows] = await conn.query('SHOW COLUMNS FROM tbl_students');
        const names = rows.map(r => r.Field);

        const definitions = {
            'student_uid': 'VARCHAR(50) DEFAULT NULL AFTER school_id',
            'stream': 'VARCHAR(100) DEFAULT NULL AFTER section',
            'admission_type': 'VARCHAR(50) DEFAULT "REGULAR" AFTER stream',
            'date_of_birth': 'DATE DEFAULT NULL AFTER admission_type',
            'gender': 'VARCHAR(20) DEFAULT NULL AFTER date_of_birth',
            'address': 'TEXT DEFAULT NULL AFTER gender',
            'email': 'VARCHAR(100) DEFAULT NULL AFTER gender',
            'aadhaar_number': 'VARCHAR(12) DEFAULT NULL AFTER email',
            'photo_url': 'VARCHAR(255) DEFAULT NULL AFTER aadhaar_number',
            'parent_name': 'VARCHAR(100) DEFAULT NULL AFTER name',
            'phone': 'VARCHAR(20) DEFAULT NULL AFTER parent_name',
            'admission_id': 'INT DEFAULT NULL AFTER status'
        };

        for (const [col, def] of Object.entries(definitions)) {
            if (!names.includes(col)) {
                try {
                    await conn.query(`ALTER TABLE tbl_students ADD COLUMN ${col} ${def}`);
                    console.log(`Added column: ${col}`);
                } catch (e) {
                    console.log(`Error adding ${col}:`, e.message);
                }
            } else {
                console.log(`Column ${col} already exists.`);
            }
        }

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error.message);
    } finally {
        await conn.end();
    }
}

migrate();
