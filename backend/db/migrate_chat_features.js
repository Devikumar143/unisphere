const { query } = require('./index');

async function migrateChatFeatures() {
    try {
        console.log('Starting migration for Chat Features (Block, Report, Mute)...');

        // 1. Create blocked_users table
        await query(`
            CREATE TABLE IF NOT EXISTS blocked_users (
                blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
                blocked_id UUID REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (blocker_id, blocked_id)
            );
        `);
        console.log('✅ Created blocked_users table');

        // 2. Create user_reports table
        await query(`
            CREATE TABLE IF NOT EXISTS user_reports (
                id SERIAL PRIMARY KEY,
                reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
                reported_id UUID REFERENCES users(id) ON DELETE CASCADE,
                reason TEXT NOT NULL,
                description TEXT,
                status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, REVIEWED, RESOLVED
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Created user_reports table');

        // 3. Create muted_chats table
        await query(`
            CREATE TABLE IF NOT EXISTS muted_chats (
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                chat_target_id UUID REFERENCES users(id) ON DELETE CASCADE, -- The other user (for DM)
                community_id UUID REFERENCES communities(id) ON DELETE CASCADE,   -- The community (for groups), nullable
                muted_until TIMESTAMP, -- Null means forever
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_mute_dm UNIQUE (user_id, chat_target_id),
                CONSTRAINT unique_mute_community UNIQUE (user_id, community_id),
                CONSTRAINT chat_target_check CHECK (
                    (chat_target_id IS NOT NULL AND community_id IS NULL) OR 
                    (chat_target_id IS NULL AND community_id IS NOT NULL)
                )
            );
        `);
        console.log('✅ Created muted_chats table');

        console.log('🎉 Migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    }
}

migrateChatFeatures();
