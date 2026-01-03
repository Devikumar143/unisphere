const { query } = require('./index');

const resetDb = async () => {
    // Truncate all tables. Order matters slightly for integrity if not using CASCADE, 
    // but CASCADE makes it easier. We'll iterate through known tables.
    // The safest way is to truncate in order of dependency reverse or just use CASCADE on all.

    // We want to keep 'universities' if needed? Assuming 'all user data' implies user generated content.
    // But users are linked to universities. We might keep universities if they are static system data.
    // However, init.js creates them? No, init.js creates the table.
    // Let's assume we clean everything except potentially 'universities' if it's considered system config.
    // Given the previous conversation, there's no mention of pre-seeding universities, so let's wipe that too or just users.
    // Safer to wipe users and everything downstream.

    const tables = [
        'notifications',
        'likes',
        'comments',
        'chat_messages',
        // 'community_members', // Table missing in DB
        'posts',
        'communities',
        'follows',
        'users',
        // 'universities' // Optional: wipe this if we want a full slate, but maybe keep if it was manually added.
    ];

    try {
        console.log('Starting database reset...');

        // Disable triggers potentially if needed, but simple TRUNCATE CASCADE should work.
        // We will use TRUNCATE table_name CASCADE;

        for (const table of tables) {
            console.log(`Truncating ${table}...`);
            await query(`TRUNCATE TABLE ${table} CASCADE`);
        }

        console.log('✅ Database reset complete. All user data deleted.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error resetting database:', err);
        process.exit(1);
    }
};

resetDb();
