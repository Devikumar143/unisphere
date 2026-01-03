const { query } = require('./db/index');

async function migratePolls() {
    console.log('Starting Polls migration...');
    try {
        // 1. Add poll_data column
        await query(`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS poll_data JSONB`);
        console.log('- Verified poll_data column');

        console.log('Migration successful!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
}

migratePolls();
