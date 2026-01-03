const { query } = require('./db');

async function migrate() {
    try {
        console.log('Starting Lounge Migration...');

        // 1. Add group_id to chat_messages
        await query(`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES communities(id)`);
        console.log('- Verified group_id column');

        // 2. Add delivered_at
        await query(`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP`);
        console.log('- Verified delivered_at column');

        // 3. Add read_at (might be missing for some users)
        await query(`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP`);
        console.log('- Verified read_at column');

        // 4. Add is_deleted
        await query(`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE`);
        console.log('- Verified is_deleted column');

        console.log('Lounge Migration complete! 🚀');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
