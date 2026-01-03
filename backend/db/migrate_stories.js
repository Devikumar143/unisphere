const { query } = require('./index');

const migrateStories = async () => {
    try {
        console.log('Starting stories migration...');

        await query(`
            CREATE TABLE IF NOT EXISTS stories (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                media_url TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
            );
        `);

        console.log('Table "stories" created/verified successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

migrateStories();
