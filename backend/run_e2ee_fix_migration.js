const pool = require('./db');

async function runMigration() {
    try {
        console.log('Starting E2EE Schema Fix...');

        console.log('Adding encryption columns to chat_messages table...');

        try {
            await pool.query(`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS encrypted BOOLEAN DEFAULT FALSE`);
            console.log(' - Added encrypted column');
        } catch (e) {
            console.log(' - encrypted column might already exist or error:', e.message);
        }

        try {
            await pool.query(`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS prekey_id INTEGER`);
            console.log(' - Added prekey_id column');
        } catch (e) {
            console.log(' - prekey_id column might already exist or error:', e.message);
        }

        try {
            await pool.query(`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS device_id INTEGER DEFAULT 1`);
            console.log(' - Added device_id column');
        } catch (e) {
            console.log(' - device_id column might already exist or error:', e.message);
        }

        console.log('\n✅ E2EE Schema Fix completed!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration error:', error);
        process.exit(1);
    }
}

runMigration();
