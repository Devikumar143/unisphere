const { Pool } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://unisphere_db_rkds_user:IA2gz5n09XXIwRnpPd3WUStEc0JPSd0U@dpg-d5cen3shg0os73e7e4mg-a.oregon-postgres.render.com/unisphere_db_rkds?ssl=true";

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function listUsers() {
    try {
        const res = await pool.query("SELECT id, full_name, email, username FROM users ORDER BY created_at DESC");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Error fetching users:', err);
    } finally {
        await pool.end();
    }
}

listUsers();
