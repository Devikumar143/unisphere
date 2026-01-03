const { query } = require('./index');

const updateSchema = async () => {
    try {
        console.log('Adding username column to users table...');
        await query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;
        `);
        console.log('✅ Added username column.');

        console.log('Checking/Creating community_members table...');
        await query(`
            CREATE TABLE IF NOT EXISTS community_members (
                community_id UUID REFERENCES communities(id),
                user_id UUID REFERENCES users(id),
                role VARCHAR(20) DEFAULT 'member',
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (community_id, user_id)
            );
        `);
        console.log('✅ Checked community_members table.');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error updating schema:', err);
        process.exit(1);
    }
};

updateSchema();
