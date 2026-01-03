const { query } = require('./index');

const deleteCommunities = async () => {
    try {
        console.log('🗑️ Deleting all communities...');
        // TRUNCATE communities CASCADE will remove communities, and all tables that reference it via FK
        // This includes: posts, community_members.
        // And tables referencing those (comments, likes, notifications).
        await query('TRUNCATE TABLE communities CASCADE');
        console.log('✅ All communities deleted successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error deleting communities:', err);
        process.exit(1);
    }
};

deleteCommunities();
