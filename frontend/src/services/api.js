import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// --- Production Configuration ---
const PRODUCTION_URL = 'https://unisphere-6t8k.onrender.com/api';

const getDevUrl = () => {
    if (Platform.OS === 'web') return 'http://localhost:5001/api';

    // Dynamic IP Detection for Expo Go
    const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;
    const localhost = debuggerHost?.split(':')[0] || '10.213.145.250'; // Updated fallback to current system IP
    return `http://${localhost}:5001/api`;
};

const DEVELOPMENT_URL = getDevUrl();

export const API_URL = __DEV__ ? DEVELOPMENT_URL : PRODUCTION_URL;

// Helper to ensure URLs are production-ready (Upgrade to HTTPS)
export const cleanImageUrl = (url) => {
    if (!url) return null;
    if (typeof url !== 'string') return url;

    // Force HTTPS for production Render domain
    if (url.includes('unisphere-api.onrender.com') && url.startsWith('http:')) {
        return url.replace('http:', 'https:');
    }
    return url;
};

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

export const registerUser = async (userData, retries = 2) => {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        const data = await response.json();
        if (!response.ok) {
            console.error('[API] Registration Failed:', data.error || data.details || 'Unknown Error', { status: response.status });
            throw new Error(data.error || data.details || 'Registration failed');
        }
        return data;
    } catch (error) {
        // Retry on network errors or connection resets
        if (retries > 0 && (error.message.includes('ECONNRESET') || error.message.includes('Network request failed'))) {
            console.log(`[API] Registration failed, retrying... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
            return registerUser(userData, retries - 1);
        }
        console.error('[API] Registration Network Error:', error);
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

export const fetchUserFollowers = async (userId) => {
    try {
        const response = await fetch(`${API_URL}/users/${userId}/followers`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch followers');
        return data;
    } catch (error) {
        console.error('Fetch Followers Error:', error);
        return [];
    }
};

export const fetchUserFollowing = async (userId) => {
    try {
        const response = await fetch(`${API_URL}/users/${userId}/following`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch following');
        return data;
    } catch (error) {
        console.error('Fetch Following Error:', error);
        return [];
    }
};

export const uploadUserAvatar = async (userId, imageUri) => {
    try {
        const formData = new FormData();
        const filename = imageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('avatar', {
            uri: Platform.OS === 'android' ? imageUri : imageUri.replace('file://', ''),
            name: filename || 'avatar.jpg',
            type: type || 'image/jpeg',
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
        console.error('[API] Upload Avatar Error:', error);
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

export const updateUserStatus = async (userId, status) => {
    try {
        const response = await fetch(`${API_URL}/users/${userId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update status');
        return data;
    } catch (error) {
        console.error('[API] Update Status Error:', error);
        throw error;
    }
};

export const blockUser = async (targetId, currentUserId) => {
    try {
        const response = await fetch(`${API_URL}/users/${targetId}/block`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentUserId }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to block user');
        return data;
    } catch (error) {
        console.error('Block User Error:', error);
        throw error;
    }
};

export const unblockUser = async (targetId, currentUserId) => {
    try {
        const response = await fetch(`${API_URL}/users/${targetId}/unblock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentUserId }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to unblock user');
        return data;
    } catch (error) {
        console.error('Unblock User Error:', error);
        throw error;
    }
};

export const reportUser = async (targetId, reporterId, reason, description = '') => {
    try {
        const response = await fetch(`${API_URL}/users/${targetId}/report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reporterId, reason, description }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to report user');
        return data;
    } catch (error) {
        console.error('Report User Error:', error);
        throw error;
    }
};

export const muteChat = async (targetId, userId) => {
    try {
        const response = await fetch(`${API_URL}/users/${targetId}/mute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to mute chat');
        return data;
    } catch (error) {
        console.error('Mute Chat Error:', error);
        throw error;
    }
};

export const unmuteChat = async (targetId, userId) => {
    try {
        const response = await fetch(`${API_URL}/users/${targetId}/unmute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to unmute chat');
        return data;
    } catch (error) {
        console.error('Unmute Chat Error:', error);
        throw error;
    }
};

export const fetchRelationship = async (targetId, currentUserId) => {
    try {
        const response = await fetch(`${API_URL}/users/${targetId}/relationship?currentUserId=${currentUserId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch relationship');
        return data; // { isBlocked, isMuted }
    } catch (error) {
        console.error('Fetch Relationship Error:', error);
        return { isBlocked: false, isMuted: false };
    }
};


// Media Upload (Image/Video)
export const uploadMedia = async (uri, type = 'image') => {
    try {
        if (!uri) throw new Error('No URI provided for upload');

        const filename = uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const ext = match ? match[1].toLowerCase() : 'jpg';

        // Determine mime type
        let mimeType = type === 'video' ? `video/${ext}` : `image/${ext === 'jpeg' || ext === 'jpg' ? 'jpeg' : ext}`;

        console.log(`[Push-Debug] [API] Uploading media: ${filename}, type: ${mimeType}`);
        const targetUrl = `${API_URL}/posts/upload-media`;
        console.log(`[Push-Debug] [API] Target URL: ${targetUrl}`);

        const formData = new FormData();
        // Robust URI cleaning
        const cleanUri = Platform.OS === 'ios' ? uri.replace('file://', '') : uri;

        formData.append('media', {
            uri: cleanUri,
            name: filename || (type === 'video' ? 'video.mp4' : 'image.jpg'),
            type: mimeType
        });

        const response = await fetch(targetUrl, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json',
                // Note: Do NOT set Content-Type for FormData, fetch handles it with boundary
            },
        });

        const responseText = await response.text();
        console.log(`[Push-Debug] [API] Raw Response (${response.status}):`, responseText);

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            throw new Error(`Invalid server response (${response.status}): ${responseText.substring(0, 100)}...`);
        }

        if (!response.ok) throw new Error(data.error || `Upload failed (${response.status})`);

        console.log(`[Push-Debug] [API] Upload Success:`, data.url);
        return data.url;
    } catch (error) {
        console.error('[Push-Debug] [API] Media Upload Error:', error.message);
        throw error;
    }
};

export const fetchReels = async (userId) => {
    try {
        const url = userId ? `${API_URL}/posts/reels?userId=${userId}` : `${API_URL}/posts/reels`;
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch reels');
        return data;
    } catch (error) {
        console.error('Fetch Reels Error:', error);
        return [];
    }
};

export const fetchUserReels = async (userId, currentUserId) => {
    try {
        const url = currentUserId
            ? `${API_URL}/users/${userId}/reels?currentUserId=${currentUserId}`
            : `${API_URL}/users/${userId}/reels`;
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch user reels');
        return data;
    } catch (error) {
        console.error('Fetch User Reels Error:', error);
        return [];
    }
};

// --- Verification System ---

export const applyForVerification = async (formData) => {
    try {
        const response = await fetch(`${API_URL}/users/apply-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to submit application');
        return data;
    } catch (error) {
        console.error('Apply Verification Error:', error);
        throw error;
    }
};

export const fetchVerificationStatus = async (userId) => {
    try {
        const response = await fetch(`${API_URL}/users/verification-status/${userId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch status');
        return data;
    } catch (error) {
        console.error('Fetch Verification Status Error:', error);
        return { status: 'none' };
    }
};

export const fetchAdminVerificationRequests = async () => {
    try {
        const response = await fetch(`${API_URL}/users/admin/verification-requests`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch requests');
        return data;
    } catch (error) {
        console.error('Admin Fetch Requests Error:', error);
        return [];
    }
};

export const processVerificationAction = async (requestId, action, adminId) => {
    try {
        const response = await fetch(`${API_URL}/users/admin/verify-action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId, action, adminId })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to process action');
        return data;
    } catch (error) {
        console.error('Process Verification Action Error:', error);
        throw error;
    }
};

export const subscribeToBlue = async (userId) => {
    try {
        const response = await fetch(`${API_URL}/subscriptions/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, plan: 'blue' })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Subscription failed');
        return data;
    } catch (error) {
        console.error('Subscribe to Blue Error:', error);
        throw error;
    }
};

export const fetchSubscriptionStatus = async (userId) => {
    try {
        const response = await fetch(`${API_URL}/subscriptions/status/${userId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch status');
        return data;
    } catch (error) {
        console.error('Fetch Subscription Status Error:', error);
        throw error;
    }
};

// Legacy support if needed, but we can alias it
export const uploadImage = (uri) => uploadMedia(uri, 'image');

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



export const recordReelView = async (postId) => {
    try {
        const response = await fetch(`${API_URL}/posts/${postId}/view`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Record Reel View Error:', error);
        return false;
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
        console.log(`[Push-Debug] [API] Starting file upload for URI: ${uri}`);

        // We can reuse the robust uploadMedia logic but targeting /api/upload instead if needed
        // However, looking at the backend, /api/posts/upload-media and /api/upload are similar.
        // Let's keep it specific to /api/upload for Ads to be safe, but add the same logging.

        const filename = uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const ext = match ? match[1].toLowerCase() : '';

        let type;
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
            type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
        } else if (['m4a', 'mp3', 'wav', 'aac'].includes(ext)) {
            type = ext === 'm4a' ? 'audio/x-m4a' : `audio/${ext}`;
        } else if (ext === 'pdf') {
            type = 'application/pdf';
        } else if (['doc', 'docx'].includes(ext)) {
            type = 'application/msword';
        } else {
            type = 'application/octet-stream';
        }

        const cleanUri = Platform.OS === 'ios' ? uri.replace('file://', '') : uri;

        const formData = new FormData();
        formData.append('file', {
            uri: cleanUri,
            name: filename || 'file',
            type
        });

        const targetUrl = `${API_URL}/upload`;
        console.log(`[Push-Debug] [API] Uploading to: ${targetUrl}`);

        const response = await fetch(targetUrl, {
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' }
        });

        const responseText = await response.text();
        console.log(`[Push-Debug] [API] Generic Upload Response (${response.status}):`, responseText);

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            throw new Error(`Server returned non-JSON: ${responseText.substring(0, 100)}`);
        }

        if (!response.ok) throw new Error(data.error || `Upload failed (${response.status})`);

        console.log(`[Push-Debug] [API] Generic Upload Success: ${data.url}`);
        return data.url;
    } catch (error) {
        console.error('[Push-Debug] [API] File Upload Error:', error);
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
        const session = await AsyncStorage.getItem('user_session');
        const token = session ? JSON.parse(session).token : null;
        const response = await fetch(`${API_URL}/ads`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
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
        const session = await AsyncStorage.getItem('user_session');
        const token = session ? JSON.parse(session).token : null;
        const response = await fetch(`${API_URL}/ads/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to delete ad');
        return data;
    } catch (error) {
        console.error('Delete Ad Error:', error);
        throw error;
    }
};

// Pin Message
export const pinMessage = async (communityId, messageId, userId) => {
    try {
        const response = await fetch(`${API_URL}/communities/${communityId}/pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageId, userId }),
        });
        const data = await response.json();
        return data; // { success: true, pinnedMessage: {...} }
    } catch (error) {
        console.error("Failed to pin message:", error);
    }
};

// Unpin Message
export const unpinMessage = async (communityId, userId) => {
    try {
        const response = await fetch(`${API_URL}/communities/${communityId}/unpin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Failed to unpin message:", error);
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

export const fetchLinkMetadata = async (url) => {
    try {
        const response = await fetch(`${API_URL}/metadata`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch metadata');
        return data; // { title, description, image, url }
    } catch (error) {
        console.error('Fetch Metadata Error:', error);
        return null; // Return null gracefully on failure
    }
};

export const clearChat = async (userId, otherUserId) => {
    try {
        const response = await fetch(`${API_URL}/messages/clear/${userId}/${otherUserId}`, {
            method: 'DELETE',
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to clear chat');
        return data;
    } catch (error) {
        console.error('Clear Chat Error:', error);
        throw error;
    }
};

export const fetchGifsFromProxy = async (query = '') => {
    try {
        const endpoint = query
            ? `${API_URL}/giphy/v1/search?q=${encodeURIComponent(query)}`
            : `${API_URL}/giphy/v1/trending`;

        const response = await fetch(endpoint);
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching GIFs from proxy:', error);
        return [];
    }
};

export const fetchCommunityMembers = async (communityId) => {
    try {
        const response = await fetch(`${API_URL}/communities/${communityId}/members`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch community members');
        return data;
    } catch (error) {
        console.error('Fetch Community Members Error:', error);
        return [];
    }
};

