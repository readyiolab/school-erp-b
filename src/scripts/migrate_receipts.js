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
        console.log('Finalizing Receipts schema for new Fee System...');
        
        const [rows] = await conn.query('SHOW COLUMNS FROM tbl_receipts');
        const names = rows.map(r => r.Field);

        if (!names.includes('fee_payment_id')) {
            await conn.query('ALTER TABLE tbl_receipts ADD COLUMN fee_payment_id INT DEFAULT NULL AFTER student_id');
            console.log('Added fee_payment_id to tbl_receipts');
        }

        if (!names.includes('student_id')) {
            await conn.query('ALTER TABLE tbl_receipts ADD COLUMN student_id INT DEFAULT NULL AFTER school_id');
            console.log('Added student_id to tbl_receipts');
        }

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error.message);
    } finally {
        await conn.end();
    }
}

migrate();
