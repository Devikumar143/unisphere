const { query } = require('./db');

async function checkTokens() {
    try {
        const result = await query("SELECT id, username, full_name, bio_metadata FROM users WHERE bio_metadata->>'pushToken' IS NOT NULL");
        console.log(`Found ${result.rows.length} users with push tokens.`);
        result.rows.forEach(user => {
            console.log(`User: ${user.username} (${user.id}), Name: ${user.full_name}, Token: ${user.bio_metadata.pushToken}`);
        });
        process.exit(0);
    } catch (err) {
        console.error('Error checking tokens:', err);
        process.exit(1);
    }
}

checkTokens();
