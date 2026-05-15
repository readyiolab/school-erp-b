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
        console.log('Relaxing tbl_receipts constraints for new Fee System...');
        
        // 1. Drop the foreign key (if it exists)
        try {
            await conn.query('ALTER TABLE tbl_receipts DROP FOREIGN KEY fk_tbl_receipts_fee');
            console.log('Dropped legacy foreign key fk_tbl_receipts_fee');
        } catch (e) {
            console.log('Foreign key fk_tbl_receipts_fee not found or already dropped.');
        }

        // 2. Drop the unique key on fee_id (if it exists)
        try {
            await conn.query('ALTER TABLE tbl_receipts DROP INDEX fee_id');
            console.log('Dropped legacy unique index on fee_id');
        } catch (e) {
            console.log('Unique index on fee_id not found or already dropped.');
        }

        // 3. Make fee_id nullable
        await conn.query('ALTER TABLE tbl_receipts MODIFY COLUMN fee_id INT DEFAULT NULL');
        console.log('Made fee_id nullable');

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error.message);
    } finally {
        await conn.end();
    }
}

migrate();
