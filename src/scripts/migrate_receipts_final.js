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
        console.log('Comprehensive final fix for tbl_receipts...');
        
        const [rows] = await conn.query('SHOW COLUMNS FROM tbl_receipts');
        const names = rows.map(r => r.Field);

        const definitions = {
            'amount': 'DECIMAL(10, 2) DEFAULT 0.00 AFTER receipt_number',
            'pdf_url': 'VARCHAR(500) DEFAULT NULL AFTER amount',
            'fee_payment_id': 'INT DEFAULT NULL AFTER student_id'
        };

        for (const [col, def] of Object.entries(definitions)) {
            if (!names.includes(col)) {
                await conn.query(`ALTER TABLE tbl_receipts ADD COLUMN ${col} ${def}`);
                console.log(`Added column: ${col}`);
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
