const { query } = require('./db');

async function migrate() {
    try {
        console.log('Starting migration...');

        // 1. Drop existing table to ensure schema update
        await query(`DROP TABLE IF EXISTS saved_messages`);

        // 2. Create saved_messages table with correct types
        // users.id is UUID, chat_messages.id is INTEGER (SERIAL)
        await query(`
            CREATE TABLE saved_messages (
                id SERIAL PRIMARY KEY,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
                saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, message_id)
            );
        `);
        console.log('Verified saved_messages table.');

        // 2. Add columns to chat_messages if missing
        await query(`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'text'`);
        await query(`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS voice_url TEXT`);
        await query(`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS voice_duration INTEGER`);
        await query(`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reply_to_message_id INTEGER REFERENCES chat_messages(id)`);
        await query(`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP`);
        await query(`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE`);
        console.log('Verified chat_messages columns.');

        console.log('Migration complete!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
