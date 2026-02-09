const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkCorruptedUsers() {
    try {
        console.log('Checking for null or empty user records in LOCAL DB...');
        const res = await pool.query(
            "SELECT id, email, username FROM users WHERE email IS NULL OR email = '' OR username IS NULL OR username = ''"
        );
        if (res.rows.length > 0) {
            console.log('Found corrupted records:');
            console.table(res.rows);
        } else {
            console.log('No corrupted records found.');
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkCorruptedUsers();
