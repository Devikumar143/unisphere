const { query } = require('./db');

async function migrate() {
    try {
        console.log('Starting migration: add views column to posts');
        await query(`
            ALTER TABLE posts 
            ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
        `);
        console.log('Migration successful: views column added (or already exists)');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
