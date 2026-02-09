const { Pool } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://unisphere_db_rkds_user:IA2gz5n09XXIwRnpPd3WUStEc0JPSd0U@dpg-d5cen3shg0os73e7e4mg-a.oregon-postgres.render.com/unisphere_db_rkds?ssl=true";

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkSchema() {
    try {
        console.log('Checking users table schema...');
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users'
        `);
        console.table(res.rows);
    } catch (err) {
        console.error('Error checking schema:', err);
    } finally {
        await pool.end();
    }
}

checkSchema();
