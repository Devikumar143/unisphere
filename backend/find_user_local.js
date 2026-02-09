const { Pool } = require('pg');
require('dotenv').config();

// Try to use Local Fallback if DATABASE_URL is not provided or commented out
// Note: Some systems might not load commented out lines. Let's explicitly use the local ones from .env
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function findUserLocal() {
    const search = 'yashu';
    try {
        console.log(`Searching for '${search}' in the LOCAL database (${process.env.DB_NAME})...`);
        const res = await pool.query(
            "SELECT id, full_name, email, username FROM users WHERE full_name ILIKE $1 OR username ILIKE $1 OR email ILIKE $1",
            [`%${search}%`]
        );
        if (res.rows.length > 0) {
            console.log('Found matching users in LOCAL DB:');
            console.table(res.rows);
        } else {
            console.log(`No users found matching '${search}' in LOCAL DB.`);
        }
    } catch (err) {
        console.error('Error searching local DB:', err.message);
    } finally {
        await pool.end();
    }
}

findUserLocal();
