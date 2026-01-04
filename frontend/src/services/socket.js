import { io } from 'socket.io-client';

const PRODUCTION_SOCKET_URL = 'https://unisphere-api.onrender.com';
const DEVELOPMENT_SOCKET_URL = 'http://10.218.116.250:5001';

// __DEV__ is true during local development, false in production builds
const SOCKET_URL = __DEV__ ? DEVELOPMENT_SOCKET_URL : PRODUCTION_SOCKET_URL;

let socket = null;

export const connectSocket = (userId) => {
    if (socket) {
        socket.disconnect();
    }

    socket = io(SOCKET_URL, {
        transports: ['websocket'],
        reconnection: true,
    });

    socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
        socket.emit('join', userId);
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected');
    });

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export const sendMessage = (senderId, recipientId, content, replyToMessageId = null, encrypted = false, messageType = 'text', voiceUrl = null, voiceDuration = null, attachmentUrls = []) => {
    console.log('Sending message:', { senderId, recipientId, content, replyToMessageId, encrypted, messageType, attachmentUrls });
    if (socket) {
        socket.emit('send_message', {
            senderId,
            recipientId,
            content,
            replyToMessageId,
            encrypted,
            messageType,
            voiceUrl,
            voiceDuration,
            attachmentUrls
        });
    } else {
        console.error('Socket not connected!');
    }
};

export const onReceiveMessage = (callback) => {
    if (socket) {
        socket.on('receive_message', callback);
    }
};

export const offReceiveMessage = (callback) => {
    if (socket) {
        socket.off('receive_message', callback);
    }
};

export const reactToMessage = (messageId, userId, emoji, recipientId) => {
    if (socket) {
        socket.emit('react_message', { messageId, userId, emoji, recipientId });
    }
};

export const onMessageReactionUpdated = (callback) => {
    if (socket) {
        socket.on('message_reaction_updated', callback);
    }
};

export const offMessageReactionUpdated = (callback) => {
    if (socket) {
        socket.off('message_reaction_updated', callback);
    }
};

export const onMessageSent = (callback) => {
    if (socket) {
        socket.on('message_sent', callback);
    }
};

export const onUserOnline = (callback) => {
    if (socket) {
        socket.on('user_online', callback);
    }
};

export const onUserOffline = (callback) => {
    if (socket) {
        socket.on('user_offline', callback);
    }
};

export const offUserOnline = (callback) => {
    if (socket) {
        socket.off('user_online', callback);
    }
};

export const offUserOffline = (callback) => {
    if (socket) {
        socket.off('user_offline', callback);
    }
};

// Typing indicators
export const emitTypingStart = (userId, recipientId) => {
    if (socket) {
        socket.emit('typing:start', { userId, recipientId });
    }
};

export const emitTypingStop = (userId, recipientId) => {
    if (socket) {
        socket.emit('typing:stop', { userId, recipientId });
    }
};

export const onTypingStart = (callback) => {
    if (socket) {
        socket.on('typing:start', callback);
    }
};

export const onTypingStop = (callback) => {
    if (socket) {
        socket.on('typing:stop', callback);
    }
};

export const offTypingStart = (callback) => {
    if (socket) {
        socket.off('typing:start', callback);
    }
};

export const offTypingStop = (callback) => {
    if (socket) {
        socket.off('typing:stop', callback);
    }
};

// Read receipts
export const markMessageAsRead = (messageId, userId, senderId) => {
    if (socket) {
        socket.emit('message:read', { messageId, userId, senderId });
    }
};

export const onMessageRead = (callback) => {
    if (socket) {
        socket.on('message:read', callback);
    }
};

export const offMessageRead = (callback) => {
    if (socket) {
        socket.off('message:read', callback);
    }
};

// Message deletion
export const deleteMessage = (messageId, userId, recipientId) => {
    if (socket) {
        socket.emit('message:delete', { messageId, userId, recipientId });
    }
};

export const onMessageDeleted = (callback) => {
    if (socket) {
        socket.on('message:deleted', callback);
    }
};

export const offMessageDeleted = (callback) => {
    if (socket) {
        socket.off('message:deleted', callback);
    }
};

// Message editing
export const editMessage = (messageId, userId, recipientId, content) => {
    if (socket) {
        socket.emit('message:edit', { messageId, userId, recipientId, content });
    }
};

export const onMessageUpdated = (callback) => {
    if (socket) {
        socket.on('message:updated', callback);
    }
};

export const offMessageUpdated = (callback) => {
    if (socket) {
        socket.off('message:updated', callback);
    }
};

export const getSocket = () => socket;
