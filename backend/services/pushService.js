const { Expo } = require('expo-server-sdk');
const { query } = require('../db');

const expo = new Expo();

/**
 * Sends a push notification to a specific user.
 * It looks up the user's push token in their bio_metadata.
 */
const sendPushToUser = async (userId, title, body, data = {}) => {
    try {
        const result = await query('SELECT bio_metadata FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) return;

        const metadata = result.rows[0].bio_metadata || {};
        const pushToken = metadata.pushToken;

        if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
            // Not a valid token, or no token stored
            if (pushToken) {
                console.error(`Push token ${pushToken} is not a valid Expo push token`);
            }
            return;
        }

        const messages = [{
            to: pushToken,
            sound: 'default',
            title,
            body,
            data,
        }];

        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                console.log('Push notification ticket:', ticketChunk);
                // NOTE: In a production app, you should check for errors in tickets
                // and potentially remove invalid tokens from your database.
            } catch (error) {
                console.error('Error sending push chunk:', error);
            }
        }
    } catch (e) {
        console.error('Error in sendPushToUser:', e);
    }
};

module.exports = { sendPushToUser };
