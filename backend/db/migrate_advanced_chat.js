const { query } = require('./index');

const migrateAdvancedChatFeatures = async () => {
    const migrationQuery = `
    -- Add read receipt and delivery tracking to chat_messages
    ALTER TABLE chat_messages 
    ADD COLUMN IF NOT EXISTS read_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES chat_messages(id),
    ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'voice', 'sticker', 'gif'
    ADD COLUMN IF NOT EXISTS voice_url TEXT,
    ADD COLUMN IF NOT EXISTS voice_duration INTEGER, -- in seconds
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

    -- Create saved messages table
    CREATE TABLE IF NOT EXISTS saved_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id),
        message_id UUID REFERENCES chat_messages(id),
        saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, message_id)
    );

    -- Create chat preferences table for themes
    CREATE TABLE IF NOT EXISTS chat_preferences (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id),
        chat_partner_id UUID REFERENCES users(id),
        accent_color VARCHAR(7) DEFAULT '#60A5FA',
        background_pattern VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, chat_partner_id)
    );

    -- Create index for faster message queries
    CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_recipient 
    ON chat_messages(sender_id, recipient_id);
    
    CREATE INDEX IF NOT EXISTS idx_chat_messages_read_at 
    ON chat_messages(read_at);
  `;

    try {
        await query(migrationQuery);
        console.log('✅ Advanced chat features migration completed successfully');
    } catch (err) {
        console.error('❌ Error migrating advanced chat features:', err);
        throw err;
    }
};

if (require.main === module) {
    migrateAdvancedChatFeatures()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = migrateAdvancedChatFeatures;
