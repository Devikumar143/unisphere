const { Pool } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://unisphere_db_rkds_user:IA2gz5n09XXIwRnpPd3WUStEc0JPSd0U@dpg-d5cen3shg0os73e7e4mg-a.oregon-postgres.render.com/unisphere_db_rkds?ssl=true";

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function findUser() {
    const search = 'yashu';
    try {
        console.log(`Searching for '${search}' in the database...`);
        const res = await pool.query(
            "SELECT id, full_name, email, username FROM users WHERE full_name ILIKE $1 OR username ILIKE $1 OR email ILIKE $1",
            [`%${search}%`]
        );
        if (res.rows.length > 0) {
            console.log('Found matching users:');
            console.table(res.rows);
        } else {
            console.log(`No users found matching '${search}'.`);
        }
    } catch (err) {
        console.error('Error searching users:', err);
    } finally {
        await pool.end();
    }
}

findUser();
