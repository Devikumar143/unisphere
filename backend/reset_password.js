const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://unisphere_db_rkds_user:IA2gz5n09XXIwRnpPd3WUStEc0JPSd0U@dpg-d5cen3shg0os73e7e4mg-a.oregon-postgres.render.com/unisphere_db_rkds?ssl=true";

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function resetPassword() {
    const email = 'maha@university.edu';
    const newPassword = '123456';

    try {
        console.log(`Resetting password for ${email}...`);
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        const result = await pool.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, full_name, email',
            [hash, email]
        );

        if (result.rows.length > 0) {
            console.log('Password updated successfully for:');
            console.table(result.rows);
        } else {
            console.error(`User with email ${email} not found.`);
        }
    } catch (err) {
        console.error('Error resetting password:', err);
    } finally {
        await pool.end();
    }
}

resetPassword();
