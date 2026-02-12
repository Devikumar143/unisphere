const { Expo } = require('expo-server-sdk');
const { query } = require('../db');

const expo = new Expo();

/**
 * Sends a push notification to a specific user.
 * It looks up the user's push token in their bio_metadata.
 */
const sendPushToUser = async (userId, title, body, data = {}) => {
    try {
        console.log(`[PushService] Attempting to send push to User: ${userId}`);
        const result = await query('SELECT bio_metadata FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            console.log(`[PushService] User ${userId} not found in database.`);
            return;
        }

        const metadata = result.rows[0].bio_metadata || {};
        const pushToken = metadata.pushToken;

        if (!pushToken) {
            console.log(`[PushService] No push token found for User: ${userId}`);
            return;
        }

        if (!Expo.isExpoPushToken(pushToken)) {
            console.error(`[PushService] Invalid Expo push token for User: ${userId}: ${pushToken}`);
            return;
        }

        const message = {
            to: pushToken,
            sound: 'default',
            title,
            body,
            data,
            priority: 'high',
            channelId: 'default', // matches frontend channel
        };

        console.log(`[PushService] Sending message to Expo:`, JSON.stringify(message));
        const tickets = await expo.sendPushNotificationsAsync([message]);
        console.log(`[PushService] Expo response tickets:`, JSON.stringify(tickets));

        if (tickets[0] && tickets[0].status === 'error') {
            console.error(`[PushService] Expo error for User ${userId}:`, tickets[0].message);
            if (tickets[0].details && tickets[0].details.error === 'DeviceNotRegistered') {
                console.warn(`[PushService] Device no longer registered for User ${userId}. Token: ${pushToken}`);
                // In a production app, you might want to remove this token from the user's bio_metadata
            }
        } else {
            console.log(`[PushService] Push successfully queued for User: ${userId}`);
        }

    } catch (error) {
        console.error(`[PushService] Fatal error sending push to User ${userId}:`, error);
    }
};

module.exports = { sendPushToUser };
