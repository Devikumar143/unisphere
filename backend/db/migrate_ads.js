const { query } = require('./index');

async function migrateAds() {
    try {
        console.log('Starting migration for Ads table...');

        await query(`
            CREATE TABLE IF NOT EXISTS ads (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title VARCHAR(255) NOT NULL,
                image_url TEXT NOT NULL,
                redirect_url TEXT,
                category VARCHAR(50) DEFAULT 'Ad',
                is_active BOOLEAN DEFAULT TRUE,
                views INTEGER DEFAULT 0,
                clicks INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Created ads table');

        console.log('🎉 Ads migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    }
}

migrateAds();
