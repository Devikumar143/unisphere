const { query } = require('./index');

const migrate = async () => {
    try {
        console.log('Starting migration...');

        // 1. Update communities table
        // We'll use DO blocks or simple alters. If column exists it might fail, so we can wrap in try/catch or just let it fail if already done.
        // Actually, let's just attempt alterations.

        await query(`
            ALTER TABLE communities 
            ADD COLUMN IF NOT EXISTS description TEXT,
            ADD COLUMN IF NOT EXISTS icon TEXT,
            ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `);
        console.log('Updated communities table.');

        // 2. Create community_members table
        await query(`
            CREATE TABLE IF NOT EXISTS community_members (
                community_id UUID REFERENCES communities(id),
                user_id UUID REFERENCES users(id),
                role VARCHAR(20) DEFAULT 'member', -- 'admin', 'member'
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (community_id, user_id)
            );
        `);
        console.log('Created community_members table.');

        // 3. Update posts table
        await query(`
            ALTER TABLE posts
            ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES communities(id);
        `);
        console.log('Updated posts table.');

        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    }
};

migrate();
