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
const locationRoutes = require('./routes/location');
const giphyRoutes = require('./routes/giphy');

const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Rate Limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3000, // Increased limit for development
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

// Apply to all routes
app.use(limiter);

// Security & Middleware
app.use(helmet());
app.use(cors({
    origin: '*', // Allow all origins for mobile compatibility
    credentials: true
}));
app.use(express.json({ limit: '1mb' })); // Restricted in production
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// Dynamic Logging
const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(logFormat));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Global Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Attach Socket.io to request for use in routes
app.use((req, res, next) => {
    req.io = io;
    next();
});

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
app.use('/api/location', locationRoutes);
app.use('/api/upload', require('./routes/upload'));
app.use('/api/giphy', giphyRoutes);
app.use('/api/subscriptions', require('./routes/subscriptions'));

// Remote Logging for Mobile Debugging
app.post('/api/logs', (req, res) => {
    const { level = 'info', message, details } = req.body;
    const timestamp = new Date().toISOString();
    console.log(`[MOBILE-${level.toString().toUpperCase()}] ${timestamp}: ${message}`, details || '');
    res.sendStatus(200);
});

// Metadata Preview
const { getLinkPreview } = require('link-preview-js');
app.post('/api/metadata', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
        const data = await getLinkPreview(url, {
            timeout: 5000,
            headers: {
                "user-agent": "googlebot", // Helps with some sites blocking strict scrapers
            }
        });
        res.json({
            title: data.title,
            description: data.description,
            image: data.images ? data.images[0] : (data.favicons ? data.favicons[0] : null),
            url: data.url
        });
    } catch (error) {
        console.error('Metadata Fetch Error', error);
        res.status(500).json({ error: 'Failed to fetch metadata' });
    }
});

// Basic Route
app.get('/', (req, res) => {
    res.json({ message: 'UniSphere API is running 🚀' });
});

// Start Server with Socket.io
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const { onlineUsers } = require('./socketStore');

const handleMentions = async (senderId, content, entityId) => {
    const mentionRegex = /@([a-zA-Z0-9_.]+)/g;
    const matches = [...content.matchAll(mentionRegex)];
    if (matches.length === 0) return;

    const senderRes = await query('SELECT full_name FROM users WHERE id = $1', [senderId]);
    const senderName = senderRes.rows[0]?.full_name || 'Someone';

    for (const match of matches) {
        const username = match[1];
        try {
            const userRes = await query('SELECT id FROM users WHERE username = $1', [username]);
            if (userRes.rows.length > 0) {
                const recipientId = userRes.rows[0].id;
                if (recipientId === senderId) continue;

                await query(
                    `INSERT INTO notifications (recipient_id, sender_id, type, entity_id) VALUES ($1, $2, $3, $4)`,
                    [recipientId, senderId, 'MENTION', entityId]
                );

                await sendPushToUser(
                    recipientId,
                    'New Mention',
                    `${senderName} mentioned you: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
                    { type: 'MENTION', senderId, entityId }
                );

                const recipientSocketId = onlineUsers.get(recipientId);
                if (recipientSocketId) {
                    io.to(recipientSocketId).emit('notification_received', {
                        type: 'MENTION',
                        senderId,
                        senderName,
                        entityId
                    });
                }
            }
        } catch (error) {
            console.error(`Error handling mention for ${username}:`, error);
        }
    }
};


// --- User Routes ---
app.put('/users/:userId/status', async (req, res) => {
    const { userId } = req.params;
    const { status } = req.body;
    try {
        await query('UPDATE users SET status = $1 WHERE id = $2', [status, userId]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

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
        const { senderId, recipientId, content, replyToMessageId, encrypted, messageType, voiceUrl, voiceDuration, attachmentUrls } = data;
        let replyDetails = null;

        // Fetch reply details if exists
        if (replyToMessageId) {
            const replyRes = await query(`
                SELECT cm.message, cm.sender_id, u.full_name 
                FROM chat_messages cm
                JOIN users u ON cm.sender_id = u.id
                WHERE cm.id = $1
            `, [replyToMessageId]);

            if (replyRes.rows.length > 0) {
                const r = replyRes.rows[0];
                replyDetails = {
                    id: replyToMessageId,
                    content: r.message,
                    senderId: r.sender_id,
                    senderName: r.full_name
                };
            }
        }

        // Save to database
        try {
            const sql = `
                INSERT INTO chat_messages (sender_id, recipient_id, message, reply_to_message_id, encrypted, message_type, voice_url, voice_duration, attachment_urls)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id, sender_id, recipient_id, message, sent_at, reply_to_message_id, encrypted, message_type, voice_url, voice_duration, reactions, attachment_urls
            `;
            const result = await query(sql, [senderId, recipientId, content, replyToMessageId, encrypted || false, messageType || 'text', voiceUrl, voiceDuration, attachmentUrls]);
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
                    voiceDuration: message.voice_duration,
                    attachmentUrls: message.attachment_urls,
                    replyToDetails: replyDetails || null
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
                voiceDuration: message.voice_duration,
                attachmentUrls: message.attachment_urls
            });

            // Handle mentions
            handleMentions(senderId, content, message.id);
        } catch (error) {

            console.error('Error saving message:', error);
            socket.emit('message_error', { error: 'Failed to send message' });
        }
    });

    // Handle Polls
    socket.on('create_poll', async (data) => {
        const { senderId, communityId, question, options } = data;
        const pollData = {
            question,
            options: options.map(opt => ({ text: opt, votes: [] })),
            voters: []
        };

        try {
            const sql = `
                INSERT INTO chat_messages (sender_id, group_id, message, message_type, poll_data)
                VALUES ($1, $2, $3, 'poll', $4)
                RETURNING id, sender_id, group_id, message, message_type, poll_data, sent_at
            `;
            const result = await query(sql, [senderId, communityId, `Poll: ${question}`, JSON.stringify(pollData)]);
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
                pollData: typeof message.poll_data === 'string' ? JSON.parse(message.poll_data) : message.poll_data,
                timestamp: message.sent_at
            });
        } catch (error) {
            console.error('Error creating poll:', error);
        }
    });

    socket.on('vote_poll', async (data) => {
        const { messageId, communityId, userId, optionIndex } = data;

        try {
            const fetchRes = await query('SELECT poll_data FROM chat_messages WHERE id = $1', [messageId]);
            if (fetchRes.rows.length === 0) return;

            let pollData = typeof fetchRes.rows[0].poll_data === 'string'
                ? JSON.parse(fetchRes.rows[0].poll_data)
                : fetchRes.rows[0].poll_data;

            if (pollData.voters.includes(userId)) return; // Already voted

            pollData.voters.push(userId);
            pollData.options[optionIndex].votes.push(userId);

            await query('UPDATE chat_messages SET poll_data = $1 WHERE id = $2', [JSON.stringify(pollData), messageId]);

            io.to(`community_${communityId}`).emit('update_poll_results', {
                messageId,
                pollData
            });
        } catch (error) {
            console.error('Error voting on poll:', error);
        }
    });

    // Handle initial community PIN state sync if needed
    socket.on('sync_community_pin', async ({ communityId }) => {
        try {
            const res = await query(`
                SELECT c.pinned_message_id, m.message as content, u.full_name as sender_name, m.id as message_id
                FROM communities c
                LEFT JOIN chat_messages m ON c.pinned_message_id = m.id
                LEFT JOIN users u ON m.sender_id = u.id
                WHERE c.id = $1
            `, [communityId]);

            if (res.rows[0]?.pinned_message_id) {
                socket.emit('community_pinned_message_updated', {
                    communityId,
                    pinnedMessage: {
                        id: res.rows[0].message_id,
                        content: res.rows[0].content,
                        senderName: res.rows[0].sender_name
                    }
                });
            }
        } catch (err) {
            console.error(err);
        }
    });

    // Handle sending Group (Lounge) messages
    socket.on('send_group_message', async (data) => {
        const { senderId, communityId, content, replyTo, messageType, attachmentUrls } = data;
        try {
            const sql = `
                INSERT INTO chat_messages (sender_id, group_id, message, reply_to_message_id, message_type, attachment_urls)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, sender_id, group_id, message, sent_at, reply_to_message_id, message_type, attachment_urls
            `;
            const result = await query(sql, [senderId, communityId, content, replyTo, messageType || 'text', attachmentUrls]);
            const message = result.rows[0];

            const senderRes = await query('SELECT full_name FROM users WHERE id = $1', [senderId]);
            const senderName = senderRes.rows[0]?.full_name || 'Member';

            io.to(`community_${communityId}`).emit('receive_group_message', {
                id: message.id,
                senderId: message.sender_id,
                senderName,
                communityId: message.group_id,
                content: message.message,
                timestamp: message.sent_at,
                replyTo: message.reply_to_message_id,
                messageType: message.message_type,
                attachmentUrls: message.attachment_urls
            });

            // Handle mentions in group message
            handleMentions(senderId, content, message.id);

            // Notify other community members via push (optional but recommended)
            const communityRes = await query('SELECT name FROM communities WHERE id = $1', [communityId]);
            const communityName = communityRes.rows[0]?.name || 'Community';

            // Get all other members of the community
            const membersRes = await query('SELECT user_id FROM community_members WHERE community_id = $1 AND user_id != $2', [communityId, senderId]);

            // For now, let's only notify them if they are NOT current recipients of the socket event
            // (or just notify everyone who isn't the sender, as push behaves differently than sockets)
            // To prevent massive spam, we might want to limit this or only do it for mentions.
            // But per plan, we'll notify members.
            for (const member of membersRes.rows) {
                // Skip if they are online and in the community room (to reduce noise)
                // However, socket room check is hard globally. 
                // We'll just send push to everyone else.
                await sendPushToUser(
                    member.user_id,
                    `New in ${communityName}`,
                    `${senderName}: ${messageType === 'text' ? content : 'Sent an attachment'}`,
                    { type: 'COMMUNITY_CHAT', communityId, senderId }
                );
            }

        } catch (error) {
            console.error('Error sending group message:', error);
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

    // --- In-Chat Mini-Games ---
    socket.on('game:start', async (data) => {
        const { senderId, recipientId, gameType, initialState } = data;
        const recipientSocketId = onlineUsers.get(recipientId);

        console.log(`Game ${gameType} started by ${senderId} for ${recipientId}`);

        if (recipientSocketId) {
            io.to(recipientSocketId).emit('game:started', {
                senderId,
                gameType,
                initialState
            });
        }
    });

    socket.on('game:move', async (data) => {
        const { senderId, recipientId, messageId, move, gameState } = data;
        const recipientSocketId = onlineUsers.get(recipientId);

        console.log(`Game move by ${senderId} in game ${messageId}`);

        // Update game state in DB (stored in the 'message' or 'poll_data' column, 
        // preferring 'poll_data' for structured data if move is complex, 
        // but for Tic-Tac-Toe, let's use a specialized game logic)
        try {
            await query(
                'UPDATE chat_messages SET poll_data = $1 WHERE id = $2',
                [JSON.stringify(gameState), messageId]
            );

            if (recipientSocketId) {
                io.to(recipientSocketId).emit('game:moved', {
                    senderId,
                    messageId,
                    move,
                    gameState
                });
            }
        } catch (error) {
            console.error('Error updating game move:', error);
        }
    });

    // WebRTC Call Signaling
    socket.on('call:initiate', (data) => {
        const { senderId, recipientId, offer, isVideo } = data;
        const recipientSocketId = onlineUsers.get(recipientId);

        console.log(`Call initiated from ${senderId} to ${recipientId}`);

        if (recipientSocketId) {
            io.to(recipientSocketId).emit('call:incoming', {
                senderId,
                offer,
                isVideo
            });
        } else {
            // Notify sender user is offline
            socket.emit('call:error', { message: 'User is offline' });
        }
    });

    socket.on('call:answer', (data) => {
        const { senderId, recipientId, answer } = data; // senderId here is the one ANSWERING (callee), recipientId is the original CALLER
        const callerSocketId = onlineUsers.get(recipientId);

        console.log(`Call answered by ${senderId} for ${recipientId}`);

        if (callerSocketId) {
            io.to(callerSocketId).emit('call:answered', {
                senderId, // The one answering
                answer
            });
        }
    });

    socket.on('call:ice-candidate', (data) => {
        const { senderId, recipientId, candidate } = data;
        const targetSocketId = onlineUsers.get(recipientId);

        if (targetSocketId) {
            io.to(targetSocketId).emit('call:ice-candidate', {
                senderId,
                candidate
            });
        }
    });

    socket.on('call:reject', (data) => {
        const { senderId, recipientId } = data;
        const callerSocketId = onlineUsers.get(recipientId);
        if (callerSocketId) {
            io.to(callerSocketId).emit('call:rejected', { senderId });
        }
    });

    socket.on('call:end', (data) => {
        const { senderId, recipientId } = data;
        const targetSocketId = onlineUsers.get(recipientId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('call:ended', { senderId });
        }
    });

    socket.on('disconnect', () => {
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

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(`[Global Error Handler] ${err.stack}`);

    const statusCode = err.status || 500;
    const response = {
        error: process.env.NODE_ENV === 'production'
            ? 'An internal server error occurred'
            : err.message
    };

    if (process.env.NODE_ENV !== 'production') {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Socket.io ready for real-time messaging`);
});
module.exports = { app, server, io, onlineUsers };
