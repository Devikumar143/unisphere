const { query } = require('./db');

async function migrate() {
    try {
        console.log('Starting migration: add is_verified column to users');
        await query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
        `);
        console.log('Migration successful: is_verified column added (or already exists)');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
