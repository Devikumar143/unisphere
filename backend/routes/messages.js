const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { onlineUsers } = require('../socketStore');

// Get all saved messages for a user
router.get('/saved/:userId', async (req, res) => {
    const { userId } = req.params;

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

        const savedMessages = result.rows.map(row => ({
            id: row.id,
            senderId: row.sender_id,
            senderName: row.sender_name,
            content: row.message,
            timestamp: row.sent_at,
            savedAt: row.saved_at,
            messageType: row.message_type,
            pollData: row.poll_data,
            voiceUrl: row.voice_url
        }));

        res.json(savedMessages);
    } catch (err) {
        console.error('Detailed Error in GET /saved/:userId:', err);
        res.status(500).json({ error: 'Server error fetching saved messages', details: err.message });
    }
});

// Get all conversations for a user
router.get('/conversations/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const sql = `
            SELECT DISTINCT ON (other_user_id)
                other_user_id,
                u.full_name as name,
                u.bio_metadata->>'avatar' as avatar,
                u.role,
                u.department,
                last_message,
                last_message_time
            FROM (
                SELECT 
                    CASE 
                        WHEN sender_id = $1 THEN recipient_id
                        ELSE sender_id
                    END as other_user_id,
                    message as last_message,
                    sent_at as last_message_time
                FROM chat_messages
                WHERE (sender_id = $1 OR recipient_id = $1) AND (is_deleted IS FALSE OR is_deleted IS NULL)
                ORDER BY sent_at DESC
            ) conversations
            JOIN users u ON u.id = conversations.other_user_id
            ORDER BY other_user_id, last_message_time DESC
        `;

        const result = await query(sql, [userId]);

        const conversations = result.rows.map(row => ({
            id: row.other_user_id,
            name: row.name,
            avatar: row.avatar || null,
            role: row.role,
            department: row.department,
            lastMessage: row.last_message,
            lastMessageTime: row.last_message_time,
            isOnline: onlineUsers.has(row.other_user_id)
        }));

        res.json(conversations);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching conversations' });
    }
});

// Get all messages for a group (community)
router.get('/group/:communityId', async (req, res) => {
    const { communityId } = req.params;
    console.log('[API] Fetching group messages for communityId:', communityId);

    try {
        const sql = `
            SELECT cm.id, cm.sender_id, cm.message, cm.reactions, cm.sent_at, 
                   cm.read_at, cm.delivered_at, cm.reply_to_message_id, cm.message_type,
                   cm.voice_url, cm.voice_duration, cm.is_deleted, cm.poll_data, cm.attachment_urls,
                   u.full_name as sender_name,
                   (SELECT message FROM chat_messages WHERE id = cm.reply_to_message_id) as reply_to_content,
                   (SELECT u2.full_name FROM chat_messages cm2 JOIN users u2 ON u2.id = cm2.sender_id WHERE cm2.id = cm.reply_to_message_id) as reply_to_sender_name
            FROM chat_messages cm
            JOIN users u ON u.id = cm.sender_id
            WHERE cm.group_id = $1::uuid AND (cm.is_deleted IS FALSE OR cm.is_deleted IS NULL)
            ORDER BY cm.sent_at ASC
        `;

        const result = await query(sql, [communityId]);
        console.log(`[API] Found ${result.rows.length} group messages for ${communityId}`);

        const messages = result.rows.map(row => ({
            id: row.id,
            senderId: row.sender_id,
            senderName: row.sender_name,
            content: row.message,
            reactions: row.reactions || {},
            timestamp: row.sent_at,
            readAt: row.read_at,
            deliveredAt: row.delivered_at,
            replyTo: row.reply_to_message_id,
            replyToContent: row.reply_to_content,
            replyToSenderName: row.reply_to_sender_name,
            messageType: row.message_type,
            pollData: row.poll_data,
            voiceUrl: row.voice_url,
            voiceDuration: row.voice_duration,
            attachmentUrls: row.attachment_urls,
            isDeleted: row.is_deleted
        }));

        res.json(messages);
    } catch (err) {
        console.error('[API] Error fetching group messages:', err);
        res.status(500).json({ error: 'Server error fetching group messages', details: err.message });
    }
});

// Get message history between two users
router.get('/:userId/:otherUserId', async (req, res) => {
    const { userId, otherUserId } = req.params;

    try {
        const sql = `
            SELECT id, sender_id, recipient_id, message, reactions, sent_at, 
                   read_at, delivered_at, reply_to_message_id, message_type,
                   voice_url, voice_duration, is_deleted, attachment_urls
            FROM chat_messages
            WHERE ((sender_id = $1 AND recipient_id = $2)
               OR (sender_id = $2 AND recipient_id = $1))
               AND (is_deleted IS FALSE OR is_deleted IS NULL)
            ORDER BY sent_at ASC
        `;

        const result = await query(sql, [userId, otherUserId]);

        const messages = result.rows.map(row => ({
            id: row.id,
            senderId: row.sender_id,
            recipientId: row.recipient_id,
            content: row.message,
            reactions: row.reactions || {},
            timestamp: row.sent_at,
            readAt: row.read_at,
            deliveredAt: row.delivered_at,
            replyTo: row.reply_to_message_id,
            messageType: row.message_type,
            voiceUrl: row.voice_url,
            voiceDuration: row.voice_duration,
            attachmentUrls: row.attachment_urls,
            isDeleted: row.is_deleted
        }));

        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching messages' });
    }
});

// Save/bookmark a message
router.post('/:messageId/save', async (req, res) => {
    const { messageId } = req.params;
    const { userId } = req.body;

    try {
        const sql = `
            INSERT INTO saved_messages (user_id, message_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, message_id) DO NOTHING
            RETURNING *
        `;
        const result = await query(sql, [userId, messageId]);
        res.json({ success: true, saved: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error saving message' });
    }
});

// Unsave a message
router.delete('/:messageId/save', async (req, res) => {
    const { messageId } = req.params;
    const { userId } = req.query;

    try {
        const sql = `DELETE FROM saved_messages WHERE user_id = $1 AND message_id = $2`;
        await query(sql, [userId, messageId]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error unsaving message' });
    }
});

// Route removed as it was a duplicate of lines 7-37

// Forward a message
router.post('/:messageId/forward', async (req, res) => {
    const { messageId } = req.params;
    const { userId, recipientId } = req.body;

    try {
        // Get original message
        const fetchSql = `SELECT * FROM chat_messages WHERE id = $1`;
        const fetchResult = await query(fetchSql, [messageId]);

        if (fetchResult.rows.length === 0) {
            return res.status(404).json({ error: 'Message not found' });
        }

        const originalMessage = fetchResult.rows[0];

        // Create forwarded message
        const insertSql = `
            INSERT INTO chat_messages (sender_id, recipient_id, message, message_type, voice_url, voice_duration, attachment_urls)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const result = await query(insertSql, [
            userId,
            recipientId,
            originalMessage.message,
            originalMessage.message_type,
            originalMessage.voice_url,
            originalMessage.voice_duration,
            originalMessage.attachment_urls
        ]);

        res.json({ success: true, message: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error forwarding message' });
    }
});

// Edit a message
router.put('/:messageId', async (req, res) => {
    const { messageId } = req.params;
    const { userId, content } = req.body;

    try {
        // Verify ownership
        const verifySql = `SELECT sender_id FROM chat_messages WHERE id = $1`;
        const verifyResult = await query(verifySql, [messageId]);

        if (verifyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Message not found' });
        }

        if (verifyResult.rows[0].sender_id !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const updateSql = `
            UPDATE chat_messages 
            SET message = $1, is_edited = TRUE 
            WHERE id = $2 
            RETURNING *
        `;
        const result = await query(updateSql, [content, messageId]);

        res.json({ success: true, message: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error editing message' });
    }
});


module.exports = router;
