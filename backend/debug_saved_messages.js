const { query } = require('./db');

async function debugSaved() {
    const userId = '73080d38-d1b6-4261-a03e-dd480203e5a8'; // Valid user ID from logs
    console.log('Testing Saved Messages Query for:', userId);

    try {
        const sql = `
            SELECT cm.*, sm.saved_at, u.full_name as sender_name
            FROM saved_messages sm
            JOIN chat_messages cm ON cm.id = sm.message_id
            JOIN users u ON u.id = cm.sender_id
            WHERE sm.user_id = $1
            ORDER BY sm.saved_at DESC
        `;
        const result = await query(sql, [userId]);
        console.log('Success! Rows:', result.rows.length);
    } catch (err) {
        console.error('QUERY FAILED!');
        console.error('Message:', err.message);
        console.error('Detail:', err.detail);
        console.error('Hint:', err.hint);
        console.error('Full Error:', JSON.stringify(err, null, 2));
    }
    process.exit(0);
}

debugSaved();
