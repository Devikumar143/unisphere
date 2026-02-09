const { query } = require('./db');

async function verifyUser() {
    try {
        const userId = '73080d38-d1b6-4261-a03e-dd480203e5a8';
        console.log(`Verifying user: ${userId}`);
        await query('UPDATE users SET is_verified = TRUE WHERE id = $1', [userId]);
        console.log('User devikumar verified successfully');
        process.exit(0);
    } catch (err) {
        console.error('Failed to verify user:', err);
        process.exit(1);
    }
}

verifyUser();
