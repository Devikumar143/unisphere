const { sendPushToUser } = require('./services/pushService');
const { query } = require('./db');

async function testPush(userId) {
    console.log(`Testing push for user ID: ${userId}`);
    await sendPushToUser(
        userId,
        "Test Notification 🚀",
        "This is a manual test from the server!",
        { type: 'TEST' }
    );
    console.log('Done.');
    process.exit(0);
}

const targetUserId = process.argv[2];
if (!targetUserId) {
    console.log('Usage: node test_push.js <userId>');
    process.exit(1);
}

testPush(targetUserId);
