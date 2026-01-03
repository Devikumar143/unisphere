const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const { query } = require('./db');
const { sendPushToUser } = require('./services/pushService');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const notificationRoutes = require('./routes/notifications');
const communityRoutes = require('./routes/communities');
const storyRoutes = require('./routes/stories');
const keysRoutes = require('./routes/keys');
const adRoutes = require('./routes/ads');

const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Middleware
app.use(helmet()); // Basic security headers
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://your-production-app.com'] // REPLACE with your real app domain
        : '*',
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Dynamic Logging
const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(logFormat));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/keys', keysRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/upload', require('./routes/upload'));

// Remote Logging for Mobile Debugging
app.post('/api/logs', (req, res) => {
    const { level = 'info', message, details } = req.body;
    const timestamp = new Date().toISOString();
    console.log(`[MOBILE-${level.toString().toUpperCase()}] ${timestamp}: ${message}`, details || '');
    res.sendStatus(200);
});

// Basic Route
app.get('/', (req, res) => {
    res.json({ message: 'UniSphere API is running 🚀' });
});

// Start Server with Socket.io
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for development
        methods: ["GET", "POST"]
    }
});

const { onlineUsers } = require('./socketStore');

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // User joins with their ID
    socket.on('join', (userId) => {
        onlineUsers.set(userId, socket.id);
        console.log(`User ${userId} joined`);

        // Broadcast online status
        io.emit('user_online', userId);
    });

    // Community Rooms
    socket.on('join_community', (communityId) => {
        socket.join(`community_${communityId}`);
        console.log(`Socket ${socket.id} joined community_${communityId}`);
    });

    socket.on('leave_community', (communityId) => {
        socket.leave(`community_${communityId}`);
        console.log(`Socket ${socket.id} left community_${communityId}`);
    });

    socket.on('typing_community', (data) => {
        const { communityId, userId, userName } = data;
        socket.to(`community_${communityId}`).emit('user_typing_community', { userId, userName, communityId });
    });

    socket.on('stop_typing_community', (data) => {
        const { communityId, userId } = data;
        socket.to(`community_${communityId}`).emit('user_stop_typing_community', { userId, communityId });
    });

    socket.on('react_group_message', async (data) => {
        const { messageId, communityId, userId, reaction } = data;
        try {
            // Fetch current reactions
            const res = await query('SELECT reactions FROM chat_messages WHERE id = $1', [messageId]);
            let reactions = res.rows[0]?.reactions || {};

            if (!reactions[reaction]) reactions[reaction] = [];

            // Toggle reaction
            const index = reactions[reaction].indexOf(userId);
            if (index > -1) {
                reactions[reaction].splice(index, 1);
            } else {
                reactions[reaction].push(userId);
            }

            await query('UPDATE chat_messages SET reactions = $1 WHERE id = $2', [JSON.stringify(reactions), messageId]);

            // Broadcast update
            io.to(`community_${communityId}`).emit('update_group_message_reactions', {
                messageId,
                reactions
            });
        } catch (error) {
            console.error('Error reacting to group message:', error);
        }
    });

    socket.on('delete_group_message', async (data) => {
        const { messageId, communityId, userId } = data;
        try {
            // Soft delete
            await query('UPDATE chat_messages SET is_deleted = true WHERE id = $1 AND sender_id = $2', [messageId, userId]);
            io.to(`community_${communityId}`).emit('group_message_deleted', { messageId });
        } catch (error) {
            console.error('Error deleting group message:', error);
        }
    });

    socket.on('create_poll', async (data) => {
        const { senderId, communityId, question, options } = data;
        try {
            const pollData = {
                question,
                options: options.map(opt => ({ text: opt, votes: [] })),
                voters: []
            };

            const sql = `
                INSERT INTO chat_messages (sender_id, group_id, message, message_type, poll_data)
                VALUES ($1, $2, $3, 'poll', $4)
                RETURNING id, sender_id, group_id, message, sent_at, poll_data
            `;
            const result = await query(sql, [senderId, communityId, question, JSON.stringify(pollData)]);
            const message = result.rows[0];

            const senderResult = await query('SELECT full_name FROM users WHERE id = $1', [senderId]);
            const senderName = senderResult.rows[0]?.full_name || 'Member';

            io.to(`community_${communityId}`).emit('receive_group_message', {
                id: message.id,
                senderId: message.sender_id,
                senderName,
                communityId: message.group_id,
                content: message.message,
                messageType: 'poll',
                pollData: message.poll_data,
                timestamp: message.sent_at
            });
        } catch (error) {
            console.error('Error creating poll:', error);
        }
    });

    socket.on('vote_poll', async (data) => {
        const { messageId, communityId, userId, optionIndex } = data;
        try {
            const res = await query('SELECT poll_data FROM chat_messages WHERE id = $1', [messageId]);
            let pollData = res.rows[0]?.poll_data;
            if (!pollData) return;

            // Check if already voted
            if (pollData.voters.includes(userId)) return;

            // Add vote
            pollData.options[optionIndex].votes.push(userId);
            pollData.voters.push(userId);

            await query('UPDATE chat_messages SET poll_data = $1 WHERE id = $2', [JSON.stringify(pollData), messageId]);

            io.to(`community_${communityId}`).emit('update_poll_results', {
                messageId,
                pollData
            });
        } catch (error) {
            console.error('Error voting on poll:', error);
        }
    });

    // Handle sending messages
    socket.on('send_message', async (data) => {
        const { senderId, recipientId, content, replyToMessageId, encrypted, messageType, voiceUrl, voiceDuration } = data;

        // Save to database
        try {
            const sql = `
                INSERT INTO chat_messages (sender_id, recipient_id, message, reply_to_message_id, encrypted, message_type, voice_url, voice_duration)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, sender_id, recipient_id, message, sent_at, reply_to_message_id, encrypted, message_type, voice_url, voice_duration, reactions
            `;
            const result = await query(sql, [senderId, recipientId, content, replyToMessageId, encrypted || false, messageType || 'text', voiceUrl, voiceDuration]);
            const message = result.rows[0];

            // Send to recipient if online
            const recipientSocketId = onlineUsers.get(recipientId);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('receive_message', {
                    id: message.id,
                    senderId: message.sender_id,
                    recipientId: message.recipient_id,
                    content: message.message,
                    timestamp: message.sent_at,
                    replyToMessageId: message.reply_to_message_id,
                    encrypted: message.encrypted,
                    messageType: message.message_type,
                    voiceUrl: message.voice_url,
                    voiceDuration: message.voice_duration
                });
            }

            // Send push notification to recipient
            const senderRes = await query('SELECT full_name FROM users WHERE id = $1', [senderId]);
            const senderName = senderRes.rows[0]?.full_name || 'Someone';
            await sendPushToUser(
                recipientId,
                'New Message',
                `${senderName}: ${messageType === 'text' ? message.message : 'Sent an attachment'}`,
                { type: 'CHAT', senderId }
            );

            // Confirm to sender
            socket.emit('message_sent', {
                id: message.id,
                senderId: message.sender_id,
                recipientId: message.recipient_id,
                content: message.message,
                reactions: message.reactions || {},
                timestamp: message.sent_at,
                replyToMessageId: message.reply_to_message_id,
                messageType: message.message_type,
                voiceUrl: message.voice_url,
                voiceDuration: message.voice_duration
            });
        } catch (error) {
            console.error('Error saving message:', error);
            socket.emit('message_error', { error: 'Failed to send message' });
        }
    });

    // Handle sending Group (Lounge) messages
    socket.on('send_group_message', async (data) => {
        const { senderId, communityId, content, replyTo } = data;

        try {
            const sql = `
                INSERT INTO chat_messages (sender_id, group_id, message, reply_to_message_id)
                VALUES ($1, $2, $3, $4)
                RETURNING id, sender_id, group_id, message, sent_at, reply_to_message_id
            `;
            const result = await query(sql, [senderId, communityId, content, replyTo]);
            const message = result.rows[0];

            // Fetch sender info for broadcast
            const senderResult = await query('SELECT full_name FROM users WHERE id = $1', [senderId]);
            const senderName = senderResult.rows[0]?.full_name || 'Member';

            // Broadcast to the community room
            io.to(`community_${communityId}`).emit('receive_group_message', {
                id: message.id,
                senderId: message.sender_id,
                senderName,
                communityId: message.group_id,
                content: message.message,
                timestamp: message.sent_at,
                replyTo: message.reply_to_message_id
            });

            // Confirm to sender (optional if they already receive from the room)
            // But usually good for ACK
            socket.emit('group_message_sent', {
                id: message.id,
                success: true
            });
        } catch (error) {
            console.error('Error saving group message:', error);
            socket.emit('message_error', { error: 'Failed to send group message' });
        }
    });

    // Handle message reactions
    socket.on('react_message', async (data) => {
        const { messageId, userId, emoji, recipientId } = data;
        console.log('Received react_message:', { messageId, userId, emoji });

        try {
            // Fetch current reactions
            const fetchSql = `SELECT reactions FROM chat_messages WHERE id = $1`;
            const fetchRes = await query(fetchSql, [messageId]);

            if (fetchRes.rows.length === 0) return;

            let reactions = fetchRes.rows[0].reactions || {};

            // Toggle reaction
            if (!reactions[emoji]) {
                reactions[emoji] = [userId];
            } else {
                const index = reactions[emoji].indexOf(userId);
                if (index === -1) {
                    reactions[emoji].push(userId);
                } else {
                    reactions[emoji].splice(index, 1);
                    if (reactions[emoji].length === 0) {
                        delete reactions[emoji];
                    }
                }
            }

            // Update in database
            const updateSql = `UPDATE chat_messages SET reactions = $1 WHERE id = $2 RETURNING reactions`;
            const updateRes = await query(updateSql, [JSON.stringify(reactions), messageId]);
            const updatedReactions = updateRes.rows[0].reactions;

            // Broadcast update to recipient and sender
            const payload = { messageId, reactions: updatedReactions };

            socket.emit('message_reaction_updated', payload);

            const recipientSocketId = onlineUsers.get(recipientId);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('message_reaction_updated', payload);
            }
        } catch (error) {
            console.error('Error updating reaction:', error);
        }
    });

    // Handle typing indicators
    socket.on('typing:start', (data) => {
        const { userId, recipientId } = data;
        const recipientSocketId = onlineUsers.get(recipientId);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('typing:start', { userId });
        }
    });

    socket.on('typing:stop', (data) => {
        const { userId, recipientId } = data;
        const recipientSocketId = onlineUsers.get(recipientId);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('typing:stop', { userId });
        }
    });

    // Handle read receipts
    socket.on('message:read', async (data) => {
        const { messageId, userId, senderId } = data;
        try {
            const updateSql = `UPDATE chat_messages SET read_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`;
            const result = await query(updateSql, [messageId]);

            if (result.rows.length > 0) {
                const senderSocketId = onlineUsers.get(senderId);
                if (senderSocketId) {
                    io.to(senderSocketId).emit('message:read', {
                        messageId,
                        readAt: result.rows[0].read_at
                    });
                }
            }
        } catch (error) {
            console.error('Error marking message as read:', error);
        }
    });

    // Handle message deletion
    socket.on('message:delete', async (data) => {
        const { messageId, userId, recipientId } = data;
        try {
            const updateSql = `UPDATE chat_messages SET is_deleted = TRUE WHERE id = $1 AND sender_id = $2 RETURNING *`;
            const result = await query(updateSql, [messageId, userId]);

            if (result.rows.length > 0) {
                socket.emit('message:deleted', { messageId });
                const recipientSocketId = onlineUsers.get(recipientId);
                if (recipientSocketId) {
                    io.to(recipientSocketId).emit('message:deleted', { messageId });
                }
            }
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    });

    // Handle message editing
    socket.on('message:edit', async (data) => {
        const { messageId, userId, recipientId, content } = data;
        try {
            const updateSql = `
                UPDATE chat_messages 
                SET message = $1, is_edited = TRUE 
                WHERE id = $2 AND sender_id = $3 
                RETURNING *
            `;
            const result = await query(updateSql, [content, messageId, userId]);

            if (result.rows.length > 0) {
                const updatedMessage = result.rows[0];
                const payload = {
                    messageId,
                    content: updatedMessage.message,
                    isEdited: true
                };

                // Notify sender (for optimistic UI confirmation)
                socket.emit('message:updated', payload);

                // Notify recipient
                const recipientSocketId = onlineUsers.get(recipientId);
                if (recipientSocketId) {
                    io.to(recipientSocketId).emit('message:updated', payload);
                }
            }
        } catch (error) {
            console.error('Error editing message:', error);
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        // Find and remove user
        for (const [userId, socketId] of onlineUsers.entries()) {
            if (socketId === socket.id) {
                onlineUsers.delete(userId);
                io.emit('user_offline', userId);
                console.log(`User ${userId} disconnected`);
                break;
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Socket.io ready for real-time messaging`);
});
module.exports = { app, server, io, onlineUsers };
