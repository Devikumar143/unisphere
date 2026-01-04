const { Pool } = require('pg');

const DATABASE_URL = "postgresql://unisphere_db_rkds_user:IA2gz5n09XXIwRnpPd3WUStEc0JPSd0U@dpg-d5cen3shg0os73e7e4mg-a.oregon-postgres.render.com/unisphere_db_rkds?ssl=true";

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const createTablesQuery = `
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- 1. universities
    CREATE TABLE IF NOT EXISTS universities (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      domain VARCHAR(255) UNIQUE NOT NULL,
      logo_url TEXT
    );

    -- 2. users (added password_hash)
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) UNIQUE NOT NULL,
      username VARCHAR(50) UNIQUE,
      full_name VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'Student',
      department VARCHAR(100),
      batch_year VARCHAR(10),
      bio_metadata JSONB DEFAULT '{}',
      university_id UUID REFERENCES universities(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 3. communities
    CREATE TABLE IF NOT EXISTS communities (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL, -- 'Club', 'Course', 'Dept'
      description TEXT,
      icon TEXT,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      university_id UUID REFERENCES universities(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 4. posts
    CREATE TABLE IF NOT EXISTS posts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      author_id UUID REFERENCES users(id) ON DELETE CASCADE,
      content_type VARCHAR(50) NOT NULL, -- 'Photo', 'Video', 'Text', 'Poll'
      body TEXT,
      media_urls TEXT[],
      metadata JSONB DEFAULT '{}',
      community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
      visibility VARCHAR(50) DEFAULT 'Global',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 5. community_members
    CREATE TABLE IF NOT EXISTS community_members (
      community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(20) DEFAULT 'member',
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (community_id, user_id)
    );

    -- 6. chat_messages (Advanced Tracking)
    CREATE TABLE IF NOT EXISTS chat_messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
      recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
      group_id UUID REFERENCES communities(id) ON DELETE CASCADE,
      message TEXT,
      attachment_urls TEXT[],
      reactions JSONB DEFAULT '{}',
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      read_at TIMESTAMP,
      delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      reply_to_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
      message_type VARCHAR(20) DEFAULT 'text',
      voice_url TEXT,
      voice_duration INTEGER,
      poll_data JSONB,
      is_deleted BOOLEAN DEFAULT FALSE,
      is_edited BOOLEAN DEFAULT FALSE,
      encrypted BOOLEAN DEFAULT FALSE
    );

    -- 7. likes
    CREATE TABLE IF NOT EXISTS likes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, post_id)
    );

    -- 8. comments
    CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 9. follows
    CREATE TABLE IF NOT EXISTS follows (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
        following_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, following_id)
    );

    -- 10. notifications
    CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
        sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL,
        entity_id UUID,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 11. ads
    CREATE TABLE IF NOT EXISTS ads (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        image_url TEXT NOT NULL,
        redirect_url TEXT,
        category VARCHAR(50) DEFAULT 'Ad',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 12. E2EE identity_keys (UUID user_id)
    CREATE TABLE IF NOT EXISTS identity_keys (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      identity_key TEXT NOT NULL,
      registration_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 13. E2EE prekeys (UUID user_id)
    CREATE TABLE IF NOT EXISTS prekeys (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      key_id INTEGER NOT NULL,
      public_key TEXT NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, key_id)
    );

    -- 14. E2EE signed_prekeys (UUID user_id)
    CREATE TABLE IF NOT EXISTS signed_prekeys (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      key_id INTEGER NOT NULL,
      public_key TEXT NOT NULL,
      signature TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, key_id)
    );

    -- 15. stories
    CREATE TABLE IF NOT EXISTS stories (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      media_url TEXT NOT NULL,
      caption TEXT,
      expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 16. saved_messages
    CREATE TABLE IF NOT EXISTS saved_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
        saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, message_id)
    );

    -- 17. chat_preferences
    CREATE TABLE IF NOT EXISTS chat_preferences (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      accent_color VARCHAR(7) DEFAULT '#60A5FA',
      background_pattern VARCHAR(50),
      e2e_enabled BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`;

async function run() {
    try {
        console.log('--- RE-INITIALIZING PRODUCTION DATABASE ---');

        // 1. Drop existing tables safely (optional but recommended for unification)
        const tablesToDrop = [
            'chat_preferences', 'saved_messages', 'stories', 'signed_prekeys',
            'prekeys', 'identity_keys', 'notifications', 'follows', 'comments',
            'likes', 'chat_messages', 'community_members', 'posts', 'communities',
            'users', 'universities', 'ads'
        ];

        console.log('Dropping existing tables for clean schema unification...');
        for (const table of tablesToDrop) {
            await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        }

        // 2. Create tables
        console.log('Creating unified schema...');
        await pool.query(createTablesQuery);
        console.log('✅ Final Schema created successfully.');

        // 3. Seed initial data
        console.log('Seeding initial data...');
        await pool.query(`
            INSERT INTO ads (title, image_url, category) VALUES 
            ('Annual Tech Symposium 2026', 'https://images.unsplash.com/photo-1540575861501-7ad058177a33?q=80&w=2070', 'Event'),
            ('Join the University Photography Club', 'https://images.unsplash.com/photo-1452784444945-3f422708314e?q=80&w=2072', 'Announcement'),
            ('Internship Fair - This Friday', 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=2084', 'Event');
            
            -- Add a default global university for testing
            INSERT INTO universities (name, domain) VALUES ('UniSphere Global', 'unisphere.edu') 
            ON CONFLICT (domain) DO NOTHING;
        `);
        console.log('✅ Seeding complete.');

    } catch (err) {
        console.error('❌ CRITICAL ERROR:', err);
    } finally {
        await pool.end();
        console.log('--- DONE ---');
        process.exit();
    }
}

run();
