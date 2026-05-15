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
        console.log('Final comprehensive migration for Admissions & ID Cards...');
        
        // 1. Fix tbl_schools
        const [s_rows] = await conn.query('SHOW COLUMNS FROM tbl_schools');
        const s_names = s_rows.map(r => r.Field);
        if (!s_names.includes('logo_url')) {
            await conn.query('ALTER TABLE tbl_schools ADD COLUMN logo_url VARCHAR(500) AFTER receipt_sequence');
            console.log('Added logo_url to tbl_schools');
        }

        // 2. Fix tbl_id_cards
        const [i_rows] = await conn.query('SHOW COLUMNS FROM tbl_id_cards');
        const i_names = i_rows.map(r => r.Field);
        
        const i_defs = {
            'school_id': 'INT DEFAULT NULL AFTER id',
            'student_id': 'INT DEFAULT NULL AFTER school_id',
            'card_url': 'VARCHAR(500) DEFAULT NULL AFTER student_id',
            'qr_data': 'TEXT DEFAULT NULL AFTER card_url',
            'academic_year': 'VARCHAR(20) DEFAULT NULL AFTER qr_data',
            'generated_at': 'DATETIME DEFAULT NULL AFTER academic_year'
        };

        for (const [col, def] of Object.entries(i_defs)) {
            if (!i_names.includes(col)) {
                await conn.query(`ALTER TABLE tbl_id_cards ADD COLUMN ${col} ${def}`);
                console.log(`Added ${col} to tbl_id_cards`);
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
