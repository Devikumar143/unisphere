import { Platform } from 'react-native';

// --- Production Configuration ---
const PRODUCTION_URL = 'https://unisphere-api.onrender.com/api';
const DEVELOPMENT_URL = Platform.OS === 'web'
    ? 'http://localhost:5001/api'
    : 'http://10.144.108.250:5001/api';

// --- Dynamic API Switch ---
// __DEV__ is true when running npx expo start, false when running in a production build
const API_URL = __DEV__ ? DEVELOPMENT_URL : PRODUCTION_URL;

console.log(`[Networking] ${__DEV__ ? 'Development' : 'Production'} API URL:`, API_URL);

export const remoteLog = async (level, message, details = {}) => {
    try {
        await fetch(`${API_URL}/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level, message, details }),
        });
    } catch (e) {
        // Fallback to local console if remote log fails
        console.log('[RemoteLog-Failed]', message);
    }
};

export const loginUser = async (email, password) => {
    try {
        console.log(`Attempting login to: ${API_URL}/auth/login`);
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Login failed');
        return data;
    } catch (error) {
        console.error('Login Error:', error);
        throw error;
    }
};

export const registerUser = async (userData) => {
    try {
        console.log(`Attempting register to: ${API_URL}/auth/register`);
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Registration failed');
        return data;
    } catch (error) {
        console.error('Registration Error:', error);
        throw error;
    }
};

export const verifyEmail = async (email) => {
    try {
        const response = await fetch(`${API_URL}/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        return response.ok;
    } catch (error) {
        console.error('Verification Error:', error);
        return false;
    }
};

export const fetchPosts = async (userId) => {
    try {
        const url = userId ? `${API_URL}/posts?userId=${userId}` : `${API_URL}/posts`;
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch posts');
        return data;
    } catch (error) {
        console.error('Fetch Posts Error:', error);
        return [];
    }
};

export const fetchUserProfile = async (userId, currentUserId = null) => {
    try {
        const url = currentUserId ? `${API_URL}/users/${userId}?currentUserId=${currentUserId}` : `${API_URL}/users/${userId}`;
        console.log(`[API] Fetching profile from: ${url}`);
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) {
            console.error(`[API] Fetch Profile Error (${response.status}):`, data.error);
            throw new Error(data.error || 'Failed to fetch profile');
        }
        return data;
    } catch (error) {
        console.error('[API] Fetch Profile Network Error:', error);
        throw error;
    }
};

export const fetchUserByUsername = async (username, currentUserId = null) => {
    try {
        const url = currentUserId ? `${API_URL}/users/handle/${username}?currentUserId=${currentUserId}` : `${API_URL}/users/handle/${username}`;
        console.log(`[API] Fetching profile by username from: ${url}`);
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch user by username');
        return data;
    } catch (error) {
        console.error('[API] Fetch User By Username Error:', error);
        throw error;
    }
};

export const followUser = async (targetId, followerId) => {
    try {
        const response = await fetch(`${API_URL}/users/${targetId}/follow`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ followerId }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to toggle follow');
        return data;
    } catch (error) {
        console.error('Follow User Error:', error);
        throw error;
    }
};

export const uploadUserAvatar = async (userId, imageUri) => {
    try {
        const formData = new FormData();
        const filename = imageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('avatar', {
            uri: imageUri,
            name: filename,
            type: type,
        });

        const response = await fetch(`${API_URL}/users/${userId}/avatar`, {
            method: 'POST',
            body: formData,
            // Header Content-Type: multipart/form-data is set automatically by fetch when body is FormData
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to upload avatar');
        return data.avatar;
    } catch (error) {
        console.error('Upload Avatar Error:', error);
        throw error;
    }
};

export const updateUserProfile = async (userId, updates) => {
    try {
        const response = await fetch(`${API_URL}/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update profile');
        return data;
    } catch (error) {
        console.error('Update Profile Error:', error);
        throw error;
    }
};

// Image Upload
export const uploadImage = async (imageUri) => {
    try {
        const formData = new FormData();
        const filename = imageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;

        formData.append('image', {
            uri: imageUri,
            name: filename,
            type: type
        });

        const response = await fetch(`${API_URL}/posts/upload-image`, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'multipart/form-data',
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Upload failed');
        return data.imageUrl; // Returns the public URL
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
};

export const createPost = async (postData) => {
    try {
        const response = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to create post');
        return data;
    } catch (error) {
        console.error('Create Post Error:', error);
        throw error;
    }
};

export const likePost = async (postId, userId) => {
    try {
        const response = await fetch(`${API_URL}/posts/${postId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to toggle like');
        return data;
    } catch (error) {
        console.error('Like Post Error:', error);
        throw error;
    }
};

export const deletePost = async (postId, userId) => {
    try {
        const response = await fetch(`${API_URL}/posts/${postId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to delete post');
        return data;
    } catch (error) {
        console.error('Delete Post Error:', error);
        throw error;
    }
};

export const addComment = async (postId, userId, content) => {
    try {
        const response = await fetch(`${API_URL}/posts/${postId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, content }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to add comment');
        return data;
    } catch (error) {
        console.error('Add Comment Error:', error);
        throw error;
    }
};

export const fetchComments = async (postId) => {
    try {
        const response = await fetch(`${API_URL}/posts/${postId}/comments`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch comments');
        return data;
    } catch (error) {
        console.error('Fetch Comments Error:', error);
        return [];
    }
};

export const searchUsers = async (query = '') => {
    try {
        const response = await fetch(`${API_URL}/users?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to search users');
        return data;
    } catch (error) {
        console.error('Search Users Error:', error);
        return [];
    }
};

// Messaging APIs
export const fetchConversations = async (userId) => {
    try {
        const response = await fetch(`${API_URL}/messages/conversations/${userId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch conversations');
        return data;
    } catch (error) {
        console.error('Fetch Conversations Error:', error);
        return [];
    }
};

export const fetchMessages = async (userId, otherUserId) => {
    try {
        const response = await fetch(`${API_URL}/messages/${userId}/${otherUserId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch messages');
        return data;
    } catch (error) {
        console.error('Fetch Messages Error:', error);
        return [];
    }
};

export const fetchGroupMessages = async (communityId) => {
    try {
        const response = await fetch(`${API_URL}/messages/group/${communityId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch group messages');
        return data;
    } catch (error) {
        console.error('Fetch Group Messages Error:', error);
        return [];
    }
};

// Notifications
export const fetchNotifications = async (userId) => {
    try {
        const response = await fetch(`${API_URL}/notifications`, {
            headers: { 'user-id': userId }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch notifications');
        return data;
    } catch (error) {
        console.error('Fetch Notifications Error:', error);
        return [];
    }
};

export const markNotificationRead = async (id, userId) => {
    try {
        await fetch(`${API_URL}/notifications/${id}/read`, {
            method: 'POST',
            headers: { 'user-id': userId }
        });
        return true;
    } catch (error) {
        console.error('Mark Read Error:', error);
        return false;
    }
};

export const markAllNotificationsRead = async (userId) => {
    try {
        await fetch(`${API_URL}/notifications/mark-all-read`, {
            method: 'POST',
            headers: { 'user-id': userId }
        });
        return true;
    } catch (error) {
        console.error('Mark All Read Error:', error);
        return false;
    }
};

// Communities
export const fetchCommunities = async (userId = '', query = '') => {
    try {
        const params = new URLSearchParams();
        if (userId) params.append('userId', userId);
        if (query) params.append('query', query);

        const url = params.toString() ? `${API_URL}/communities?${params.toString()}` : `${API_URL}/communities`;
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch communities');
        return data;
    } catch (error) {
        console.error('Fetch Communities Error:', error);
        return [];
    }
};

export const createCommunity = async (communityData) => {
    try {
        const response = await fetch(`${API_URL}/communities`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(communityData),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to create community');
        return data;
    } catch (error) {
        console.error('Create Community Error:', error);
        throw error;
    }
};

export const joinCommunity = async (communityId, userId) => {
    try {
        const response = await fetch(`${API_URL}/communities/${communityId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to join community');
        return data;
    } catch (error) {
        console.error('Join Community Error:', error);
        throw error;
    }
};

export const leaveCommunity = async (communityId, userId) => {
    try {
        const response = await fetch(`${API_URL}/communities/${communityId}/leave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to leave community');
        return data;
    } catch (error) {
        console.error('Leave Community Error:', error);
        throw error;
    }
};

export const fetchCommunityDetails = async (communityId, userId) => {
    try {
        const url = userId ? `${API_URL}/communities/${communityId}?userId=${userId}` : `${API_URL}/communities/${communityId}`;
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch community details');
        return data;
    } catch (error) {
        console.error('Fetch Community Details Error:', error);
        throw error;
    }
};

export const fetchCommunityPosts = async (communityId, userId) => {
    try {
        const url = userId ? `${API_URL}/communities/${communityId}/posts?userId=${userId}` : `${API_URL}/communities/${communityId}/posts`;
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch community posts');
        return data;
    } catch (error) {
        console.error('Fetch Community Posts Error:', error);
        return [];
    }
};

export const updateCommunity = async (communityId, updates, userId) => {
    try {
        const response = await fetch(`${API_URL}/communities/${communityId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...updates, userId }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update community');
        return data;
    } catch (error) {
        console.error('Update Community Error:', error);
        throw error;
    }
};

export const deleteCommunity = async (communityId, userId) => {
    try {
        const response = await fetch(`${API_URL}/communities/${communityId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to delete community');
        return data;
    } catch (error) {
        console.error('Delete Community Error:', error);
        throw error;
    }
};

// Save/unsave message APIs
export const saveMessage = async (messageId, userId) => {
    try {
        const response = await fetch(`${API_URL}/messages/${messageId}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to save message');
        return data;
    } catch (error) {
        console.error('Save Message Error:', error);
        throw error;
    }
};

export const unsaveMessage = async (messageId, userId) => {
    try {
        const response = await fetch(`${API_URL}/messages/${messageId}/save?userId=${userId}`, {
            method: 'DELETE',
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to unsave message');
        return data;
    } catch (error) {
        console.error('Unsave Message Error:', error);
        throw error;
    }
};

export const fetchSavedMessages = async (userId) => {
    try {
        const response = await fetch(`${API_URL}/messages/saved/${userId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch saved messages');
        return data;
    } catch (error) {
        console.error('Fetch Saved Messages Error:', error);
        return [];
    }
};

export const forwardMessage = async (messageId, userId, recipientId) => {
    try {
        const response = await fetch(`${API_URL}/messages/${messageId}/forward`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, recipientId }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to forward message');
        return data;
    } catch (error) {
        console.error('Forward Message Error:', error);
        throw error;
    }
};


export const uploadFile = async (uri) => {
    try {
        const formData = new FormData();
        const filename = uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const ext = match ? match[1].toLowerCase() : '';

        let type;
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
            type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
        } else if (['m4a', 'mp3', 'wav', 'aac'].includes(ext)) {
            type = ext === 'm4a' ? 'audio/x-m4a' : `audio/${ext}`;
        } else {
            type = 'application/octet-stream';
        }

        formData.append('file', {
            uri,
            name: filename,
            type
        });

        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json',
                // Content-Type header excluded to let fetch generate boundary
            }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Upload failed');
        return data.url;
    } catch (error) {
        console.error('File Upload Error:', error);
        throw error;
    }
};

export const fetchUserPosts = async (userId, currentUserId) => {
    try {
        const url = currentUserId ? `${API_URL}/users/${userId}/posts?currentUserId=${currentUserId}` : `${API_URL}/users/${userId}/posts`;
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch user posts');
        return data;
    } catch (error) {
        console.error('Fetch User Posts Error:', error);
        return [];
    }
};

// Ads & Posters
export const fetchAds = async () => {
    try {
        const response = await fetch(`${API_URL}/ads`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch ads');
        return data;
    } catch (error) {
        console.error('Fetch Ads Error:', error);
        return [];
    }
};

export const createAd = async (adData) => {
    try {
        const response = await fetch(`${API_URL}/ads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(adData),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to create ad');
        return data;
    } catch (error) {
        console.error('Create Ad Error:', error);
        throw error;
    }
};

export const deleteAd = async (id) => {
    try {
        const response = await fetch(`${API_URL}/ads/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to delete ad');
        return data;
    } catch (error) {
        console.error('Delete Ad Error:', error);
        throw error;
    }
};

// Push Notifications
export const updatePushToken = async (userId, token) => {
    try {
        const response = await fetch(`${API_URL}/users/${userId}/push-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Failed to update push token:", error);
    }
};
