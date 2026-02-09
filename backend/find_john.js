const { Pool } = require('pg');
require('dotenv').config();

const DATABASE_URL = "postgresql://unisphere_db_rkds_user:IA2gz5n09XXIwRnpPd3WUStEc0JPSd0U@dpg-d5cen3shg0os73e7e4mg-a.oregon-postgres.render.com/unisphere_db_rkds?ssl=true";

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function findJohn() {
    try {
        console.log('Searching for John...');
        const res = await pool.query("SELECT id, full_name, email, username FROM users WHERE full_name ILIKE '%john%' OR username ILIKE '%john%' OR email ILIKE '%john%'");
        if (res.rows.length === 0) {
            console.log('No user named John found in production DB.');
            const allUsers = await pool.query("SELECT id, full_name, email, username FROM users LIMIT 20");
            console.log('Listing some users in DB:');
            console.table(allUsers.rows);
        } else {
            console.log('Found users:');
            console.table(res.rows);
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

findJohn();
