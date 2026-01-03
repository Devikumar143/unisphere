const { query } = require('./index');

const initDb = async () => {
  const createTablesQuery = `
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE IF NOT EXISTS universities (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      domain VARCHAR(255) UNIQUE NOT NULL,
      logo_url TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) UNIQUE NOT NULL,
      username VARCHAR(50) UNIQUE,
      full_name VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL, -- 'Student', 'Faculty', 'Alumni'
      department VARCHAR(100),
      batch_year VARCHAR(10),
      bio_metadata JSONB,
      university_id UUID REFERENCES universities(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS posts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      author_id UUID REFERENCES users(id),
      content_type VARCHAR(50) NOT NULL, -- 'Photo', 'Video', 'Text', 'Poll'
      body TEXT,
      media_urls TEXT[],
      metadata JSONB,
      community_id UUID REFERENCES communities(id),
      visibility VARCHAR(50) DEFAULT 'Global', -- 'Global', 'Class', 'Dept'
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS communities (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL, -- 'Club', 'Course', 'Dept'
      description TEXT,
      icon TEXT,
      created_by UUID REFERENCES users(id),
      university_id UUID REFERENCES universities(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS community_members (
      community_id UUID REFERENCES communities(id),
      user_id UUID REFERENCES users(id),
      role VARCHAR(20) DEFAULT 'member',
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (community_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      sender_id UUID REFERENCES users(id),
      recipient_id UUID REFERENCES users(id),
      group_id UUID REFERENCES communities(id),
      message TEXT,
      attachment_urls TEXT[],
      reactions JSONB DEFAULT '{}',
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS likes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id),
        post_id UUID REFERENCES posts(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, post_id)
    );

    CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id),
        post_id UUID REFERENCES posts(id),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS follows (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        follower_id UUID REFERENCES users(id),
        following_id UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, following_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        recipient_id UUID REFERENCES users(id),
        sender_id UUID REFERENCES users(id),
        type VARCHAR(50) NOT NULL, -- 'LIKE', 'COMMENT', 'FOLLOW'
        entity_id UUID, -- Reference to post or user
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ads (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        image_url TEXT NOT NULL,
        redirect_url TEXT,
        category VARCHAR(50) DEFAULT 'Ad', -- 'Ad', 'Event', 'Announcement'
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Seed dynamic ads/posters if none exist
    INSERT INTO ads (title, image_url, category) 
    SELECT 'Annual Tech Symposium 2026', 'https://images.unsplash.com/photo-1540575861501-7ad058177a33?q=80&w=2070', 'Event'
    WHERE NOT EXISTS (SELECT 1 FROM ads WHERE title = 'Annual Tech Symposium 2026');

    INSERT INTO ads (title, image_url, category) 
    SELECT 'Join the University Photography Club', 'https://images.unsplash.com/photo-1452784444945-3f422708314e?q=80&w=2072', 'Announcement'
    WHERE NOT EXISTS (SELECT 1 FROM ads WHERE title = 'Join the University Photography Club');

    INSERT INTO ads (title, image_url, category) 
    SELECT 'Internship Fair - This Friday', 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=2084', 'Event'
    WHERE NOT EXISTS (SELECT 1 FROM ads WHERE title = 'Internship Fair - This Friday');
  `;

  try {
    await query(createTablesQuery);
    console.log('Database tables initialized successfully');
  } catch (err) {
    console.error('Error initializing database tables:', err);
  }
};

if (require.main === module) {
  initDb();
}

module.exports = initDb;
