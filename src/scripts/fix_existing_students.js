const mysql = require('mysql2/promise');
require('dotenv').config();

async function fix() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Manually fixing Alok kumar (ID 1)...');
        await conn.query(`
            UPDATE tbl_students 
            SET 
                student_uid = 'SCH-2026-1001', 
                gender = 'MALE', 
                aadhaar_number = '829910946782', 
                date_of_birth = '2015-05-15',
                email = 'alok.parent@example.com',
                address = 'Main Street, Block A, School Area',
                status = 'ACTIVE'
            WHERE id = 1
        `);
        console.log('Fixed Student 1 successfully.');
        
        console.log('Manually fixing Surya Prakash (ID 2)...');
        await conn.query(`
            UPDATE tbl_students 
            SET 
                student_uid = 'SCH-2026-1002', 
                gender = 'MALE', 
                aadhaar_number = '919825233191', 
                date_of_birth = '2016-08-20',
                email = 'surya.parent@example.com',
                address = 'Street 5, Patel Nagar',
                status = 'ACTIVE'
            WHERE id = 2
        `);
        console.log('Fixed Student 2 successfully.');
    } catch (e) {
        console.error('Error fixing data:', e.message);
    } finally {
        await conn.end();
    }
}

fix();
