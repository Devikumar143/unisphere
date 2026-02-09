const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { sendPushToUser } = require('../services/pushService');
const { onlineUsers } = require('../socketStore');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Search Users
router.get('/', async (req, res) => {
    const { query: searchQuery } = req.query;
    try {
        let sql = `
            SELECT id, full_name, username, role, department, bio_metadata, is_verified, subscription_type, subscription_expiry 
            FROM users 
        `;
        const params = [];

        if (searchQuery) {
            sql += `WHERE full_name ILIKE $1 OR email ILIKE $1 OR username ILIKE $1`;
            params.push(`%${searchQuery}%`);
        }

        sql += ` ORDER BY created_at DESC LIMIT 20`;

        const result = await query(sql, params);

        const users = result.rows.map(user => ({
            id: user.id,
            name: user.full_name,
            username: user.username,
            role: user.role,
            department: user.department,
            avatar: user.bio_metadata?.avatar || null,
            bio: user.bio_metadata?.bio,
            isOnline: onlineUsers.has(user.id),
            isVerified: user.is_verified,
            subscriptionType: user.subscription_type,
            subscriptionExpiry: user.subscription_expiry
        }));

        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error searching users' });
    }
});

// Get User Profile by Username
router.get('/handle/:username', async (req, res) => {
    const { username } = req.params;
    try {
        const sql = 'SELECT * FROM users WHERE username = $1';
        const result = await query(sql, [username]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        // Reuse logic or redirect internally? Let's just duplicate transform for now for speed.

        // Get fresh stats (connections and posts)
        const followersRes = await query('SELECT COUNT(*) FROM follows WHERE following_id = $1', [user.id]);
        const postsRes = await query('SELECT COUNT(*) FROM posts WHERE author_id = $1', [user.id]);

        // Check if viewing user is following
        let isFollowing = false;
        const currentUserId = req.query.currentUserId;
        if (currentUserId && currentUserId !== user.id) {
            const followRes = await query('SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2', [currentUserId, user.id]);
            isFollowing = followRes.rows.length > 0;
        }

        const profileData = {
            id: user.id,
            name: user.full_name,
            username: user.username,
            role: user.role || 'Student',
            department: user.department || 'General',
            university: 'UniSphere University',
            location: user.bio_metadata?.location || 'Campus',
            bio: user.bio_metadata?.bio || 'No bio yet.',
            stats: {
                connections: parseInt(followersRes.rows[0].count) || 0,
                posts: parseInt(postsRes.rows[0].count) || 0,
                views: user.bio_metadata?.stats?.views || 0,
                views: user.bio_metadata?.stats?.views || 0
            },
            isFollowing: isFollowing,
            isOnline: onlineUsers.has(user.id),
            coverImage: user.bio_metadata?.coverImage || "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&fit=crop",
            avatar: user.bio_metadata?.avatar || null,
            isVerified: user.is_verified,
            subscriptionType: user.subscription_type,
            subscriptionExpiry: user.subscription_expiry
        };

        res.json(profileData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching user' });
    }
});

// Get User Profile by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const sql = 'SELECT * FROM users WHERE id = $1';
        const result = await query(sql, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        // Get fresh stats (connections and posts)
        const followersRes = await query('SELECT COUNT(*) FROM follows WHERE following_id = $1', [id]);
        const postsRes = await query('SELECT COUNT(*) FROM posts WHERE author_id = $1', [id]);

        // Check if viewing user is following
        let isFollowing = false;
        const currentUserId = req.query.currentUserId;
        if (currentUserId && currentUserId !== id) {
            const followRes = await query('SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2', [currentUserId, id]);
            isFollowing = followRes.rows.length > 0;
        }

        // Transform to match ProfileScreen format
        const profileData = {
            id: user.id,
            name: user.full_name,
            username: user.username,
            role: user.role || 'Student',
            department: user.department || 'General',
            university: 'UniSphere University',
            location: user.bio_metadata?.location || 'Campus',
            bio: user.bio_metadata?.bio || 'No bio yet.',
            stats: {
                connections: parseInt(followersRes.rows[0].count) || 0,
                posts: parseInt(postsRes.rows[0].count) || 0,
                views: user.bio_metadata?.stats?.views || 0
            },
            isFollowing: isFollowing,
            isOnline: onlineUsers.has(user.id),
            coverImage: user.bio_metadata?.coverImage || "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&fit=crop",
            avatar: user.bio_metadata?.avatar || null,
            isVerified: user.is_verified
        };

        res.json(profileData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching user' });
    }
});

// Update User Profile
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, department, location, bio, username } = req.body;
    const cleanUsername = username ? username.trim() : null;

    // We keep existing metadata and merge new values
    try {
        // Validate username formatting if provided
        if (cleanUsername && !/^[a-zA-Z0-9._]{3,30}$/.test(cleanUsername)) {
            return res.status(400).json({ error: 'Username must be 3-30 chars, alphanumeric, underscore or dot.' });
        }

        // Check uniqueness if updating username
        if (cleanUsername) {
            const check = await query('SELECT id FROM users WHERE username = $1 AND id != $2', [cleanUsername, id]);
            if (check.rows.length > 0) {
                return res.status(400).json({ error: 'Username already taken.' });
            }
        }

        // First get existing metadata
        const userRes = await query('SELECT bio_metadata FROM users WHERE id = $1', [id]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        let metadata = userRes.rows[0].bio_metadata || {};
        metadata = { ...metadata, location, bio }; // Update fields in JSONB

        // Simplified query construction
        const sql = `
            UPDATE users 
            SET full_name = COALESCE($1, full_name), 
                department = COALESCE($2, department), 
                bio_metadata = $3,
                username = COALESCE($4, username)
            WHERE id = $5
            RETURNING *
        `;

        const result = await query(sql, [name, department, metadata, cleanUsername, id]);

        const user = result.rows[0];
        // Return updated profile structure
        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.full_name,
                username: user.username,
                department: user.department,
                bio: user.bio_metadata?.bio,
                location: user.bio_metadata?.location
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error updating profile' });
    }
});

// Toggle Follow/Unfollow
router.post('/:id/follow', async (req, res) => {
    const { id: followingId } = req.params;
    const { followerId } = req.body;

    if (!followerId || followerId === followingId) {
        return res.status(400).json({ error: 'Invalid operation' });
    }

    try {
        // Check if already following
        const checkSql = 'SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2';
        const checkRes = await query(checkSql, [followerId, followingId]);

        if (checkRes.rows.length > 0) {
            // Unfollow
            await query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [followerId, followingId]);
            res.json({ success: true, isFollowing: false });
        } else {
            // Follow
            await query('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)', [followerId, followingId]);

            // Create Notification
            await query(
                `INSERT INTO notifications (recipient_id, sender_id, type, entity_id) VALUES ($1, $2, 'FOLLOW', $1)`,
                [followingId, followerId]
            );

            // Send push notification
            const followerRes = await query('SELECT full_name FROM users WHERE id = $1', [followerId]);
            const followerName = followerRes.rows[0]?.full_name || 'Someone';
            await sendPushToUser(
                followingId,
                'New Connection',
                `${followerName} started following you!`,
                { type: 'FOLLOW', followerId }
            );

            res.json({ success: true, isFollowing: true });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error toggling follow' });
    }
});

// Get User's Followers
router.get('/:id/followers', async (req, res) => {
    const { id } = req.params;
    try {
        const sql = `
            SELECT u.id, u.full_name as name, u.username, u.role, u.department, u.bio_metadata
            FROM follows f
            JOIN users u ON f.follower_id = u.id
            WHERE f.following_id = $1
            ORDER BY u.full_name ASC
        `;
        const result = await query(sql, [id]);
        const followers = result.rows.map(user => ({
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role,
            department: user.department,
            avatar: user.bio_metadata?.avatar || null,
            bio: user.bio_metadata?.bio
        }));
        res.json(followers);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching followers' });
    }
});

// Get User's Following
router.get('/:id/following', async (req, res) => {
    const { id } = req.params;
    try {
        const sql = `
            SELECT u.id, u.full_name as name, u.username, u.role, u.department, u.bio_metadata
            FROM follows f
            JOIN users u ON f.following_id = u.id
            WHERE f.follower_id = $1
            ORDER BY u.full_name ASC
        `;
        const result = await query(sql, [id]);
        const following = result.rows.map(user => ({
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role,
            department: user.department,
            avatar: user.bio_metadata?.avatar || null,
            bio: user.bio_metadata?.bio
        }));
        res.json(following);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching following' });
    }
});

// Upload Avatar
router.post('/:id/avatar', upload.single('avatar'), async (req, res) => {
    const { id } = req.params;
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const protocol = req.get('x-forwarded-proto') || req.protocol;
        const avatarUrl = `${protocol}://${req.get('host')}/uploads/${req.file.filename}`;

        // Get existing metadata
        const userRes = await query('SELECT bio_metadata FROM users WHERE id = $1', [id]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        let metadata = userRes.rows[0].bio_metadata || {};
        metadata.avatar = avatarUrl; // Update avatar URL

        // Update user
        await query('UPDATE users SET bio_metadata = $1 WHERE id = $2', [metadata, id]);

        res.json({
            success: true,
            avatar: avatarUrl
        });
    } catch (err) {
        console.error('Error uploading avatar:', err);
        res.status(500).json({ error: 'Server error uploading avatar' });
    }
});
// Get User's Posts
router.get('/:id/posts', async (req, res) => {
    const { id } = req.params;
    const currentUserId = req.query.currentUserId;

    try {
        const sql = `
            SELECT 
                p.id, 
                p.body as content, 
                p.media_urls,
                p.created_at,
                u.username,
                u.full_name as user_name, 
                u.role as user_role, 
                u.department as user_dept,
                u.bio_metadata,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
                 ${currentUserId ? `(SELECT COUNT(*) > 0 FROM likes WHERE post_id = p.id AND user_id = $2) as is_liked` : 'false as is_liked'}
            FROM posts p
            JOIN users u ON p.author_id = u.id
            WHERE p.author_id = $1
            ORDER BY p.created_at DESC
        `;

        const params = currentUserId ? [id, currentUserId] : [id];
        const result = await query(sql, params);

        const posts = result.rows.map(post => ({
            id: post.id,
            user: {
                id: id, // We know the author ID
                username: post.username,
                name: post.user_name,
                role: `${post.user_role} • ${post.user_dept}`,
                avatar: post.bio_metadata?.avatar || null
            },
            content: post.content,
            image: post.media_urls && post.media_urls.length > 0 ? post.media_urls[0] : null,
            time: new Date(post.created_at).toLocaleDateString(),
            stats: {
                likes: parseInt(post.likes_count),
                comments: parseInt(post.comments_count),
                isLiked: post.is_liked
            }
        }));

        res.json(posts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching user posts' });
    }
});

// Get User's Reels
router.get('/:id/reels', async (req, res) => {
    const { id } = req.params;
    const currentUserId = req.query.currentUserId;

    try {
        const sql = `
            SELECT 
                p.id, 
                p.body as description, 
                p.media_urls,
                p.created_at,
                u.username,
                u.full_name as user_name,
                u.bio_metadata,
                p.views,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
                 ${currentUserId ? `(SELECT COUNT(*) > 0 FROM likes WHERE post_id = p.id AND user_id = $2) as is_liked` : 'false as is_liked'}
            FROM posts p
            JOIN users u ON p.author_id = u.id
            WHERE p.author_id = $1 AND p.content_type = 'Reel'
            ORDER BY p.created_at DESC
        `;

        const params = currentUserId ? [id, currentUserId] : [id];
        const result = await query(sql, params);

        const reels = result.rows.map(post => ({
            id: post.id,
            video: post.media_urls[0], // First URL is video
            user: {
                id: id,
                username: post.username,
                name: post.user_name,
                avatar: post.bio_metadata?.avatar || `https://ui-avatars.com/api/?name=${post.user_name}&background=random`
            },
            description: post.description,
            views: post.views || 0,
            likes: parseInt(post.likes_count),
            comments: parseInt(post.comments_count),
            isLiked: post.is_liked,
            song: 'Original Audio' // Placeholder
        }));

        res.json(reels);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching user reels' });
    }
});

// Update Push Token
router.post('/:id/push-token', async (req, res) => {
    const { id } = req.params;
    const { token } = req.body;

    try {
        // Use jsonb_set to update or add the pushToken in bio_metadata
        // COALESCE handles cases where bio_metadata might be null
        await query(
            `UPDATE users 
             SET bio_metadata = jsonb_set(COALESCE(bio_metadata, '{}'), '{pushToken}', $1) 
             WHERE id = $2`,
            [JSON.stringify(token), id]
        );
        res.json({ success: true, message: 'Push token updated successfully' });
    } catch (err) {
        console.error('Error updating push token:', err);
        res.status(500).json({ error: 'Server error updating push token' });
    }
});

// Block User
router.post('/:id/block', async (req, res) => {
    const { id: blockedId } = req.params; // The user TO BE blocked
    const { currentUserId: blockerId } = req.body;

    if (!blockerId || blockerId === blockedId) return res.status(400).json({ error: 'Invalid operation' });

    try {
        await query(
            `INSERT INTO blocked_users (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [blockerId, blockedId]
        );

        // Also unfollow if following (optional but standard behavior)
        await query(`DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`, [blockerId, blockedId]);
        await query(`DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`, [blockedId, blockerId]);

        res.json({ success: true, message: 'User blocked' });
    } catch (err) {
        console.error('Error blocking user:', err);
        res.status(500).json({ error: 'Server error blocking user' });
    }
});

// Unblock User
router.post('/:id/unblock', async (req, res) => {
    const { id: blockedId } = req.params;
    const { currentUserId: blockerId } = req.body;

    try {
        await query(
            `DELETE FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2`,
            [blockerId, blockedId]
        );
        res.json({ success: true, message: 'User unblocked' });
    } catch (err) {
        console.error('Error unblocking user:', err);
        res.status(500).json({ error: 'Server error unblocking user' });
    }
});

// Report User
router.post('/:id/report', async (req, res) => {
    const { id: reportedId } = req.params;
    const { reporterId, reason, description } = req.body;

    try {
        await query(
            `INSERT INTO user_reports (reporter_id, reported_id, reason, description) VALUES ($1, $2, $3, $4)`,
            [reporterId, reportedId, reason, description]
        );
        res.json({ success: true, message: 'User reported' });
    } catch (err) {
        console.error('Error reporting user:', err);
        res.status(500).json({ error: 'Server error reporting user' });
    }
});

// Mute User (DM)
router.post('/:id/mute', async (req, res) => {
    const { id: targetId } = req.params;
    const { userId } = req.body;

    try {
        await query(
            `INSERT INTO muted_chats (user_id, chat_target_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [userId, targetId]
        );
        res.json({ success: true, isMuted: true });
    } catch (err) {
        console.error('Error muting user:', err);
        res.status(500).json({ error: 'Server error muting user' });
    }
});

// Unmute User (DM)
router.post('/:id/unmute', async (req, res) => {
    const { id: targetId } = req.params;
    const { userId } = req.body;

    try {
        await query(
            `DELETE FROM muted_chats WHERE user_id = $1 AND chat_target_id = $2`,
            [userId, targetId]
        );
        res.json({ success: true, isMuted: false });
    } catch (err) {
        console.error('Error unmuting user:', err);
        res.status(500).json({ error: 'Server error unmuting user' });
    }
});

// Check Relationship (Block/Mute Status)
router.get('/:id/relationship', async (req, res) => {
    const { id: targetId } = req.params;
    const { currentUserId } = req.query;

    try {
        const blockRes = await query(
            `SELECT * FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2`,
            [currentUserId, targetId]
        );
        const muteRes = await query(
            `SELECT * FROM muted_chats WHERE user_id = $1 AND chat_target_id = $2`,
            [currentUserId, targetId]
        );

        res.json({
            isBlocked: blockRes.rows.length > 0,
            isMuted: muteRes.rows.length > 0
        });
    } catch (err) {
        console.error('Error fetching relationship:', err);
        res.status(500).json({ error: 'Server error fetching relationship' });
    }
});

// --- Verification System ---

// Submit Verification Request
router.post('/apply-verification', async (req, res) => {
    const { userId, fullName, category, description } = req.body;

    if (!userId || !fullName || !category) {
        return res.status(400).json({ error: 'Please provide all required fields' });
    }

    try {
        // Check if a request already exists
        const checkRes = await query(
            'SELECT * FROM verification_requests WHERE user_id = $1 AND status = $2',
            [userId, 'pending']
        );

        if (checkRes.rows.length > 0) {
            return res.status(400).json({ error: 'You already have a pending verification request.' });
        }

        const sql = `
            INSERT INTO verification_requests (user_id, full_name, category, description)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await query(sql, [userId, fullName, category, description]);

        res.json({ success: true, request: result.rows[0] });
    } catch (err) {
        console.error('Verification Application Error:', err);
        res.status(500).json({ error: 'Server error during verification application' });
    }
});

// Get Verification Status
router.get('/verification-status/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await query(
            'SELECT * FROM verification_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
            [userId]
        );
        res.json(result.rows[0] || { status: 'none' });
    } catch (err) {
        console.error('Fetch Verification Status Error:', err);
        res.status(500).json({ error: 'Server error fetching verification status' });
    }
});

// Admin: Get all pending requests
router.get('/admin/verification-requests', async (req, res) => {
    try {
        // In a real app, we'd check req.user.role here. 
        // For this demo, we assume the frontend only calls this for admins.
        const sql = `
            SELECT vr.*, u.username, u.email, u.full_name as user_display_name
            FROM verification_requests vr
            JOIN users u ON vr.user_id = u.id
            WHERE vr.status = 'pending'
            ORDER BY vr.created_at ASC
        `;
        const result = await query(sql);
        res.json(result.rows);
    } catch (err) {
        console.error('Admin Fetch Verification Requests Error:', err);
        res.status(500).json({ error: 'Server error fetching verification requests' });
    }
});

// Admin: Approve/Reject Request
router.post('/admin/verify-action', async (req, res) => {
    const { requestId, action, adminId } = req.body; // action: 'approved' or 'rejected'

    if (!requestId || !action) {
        return res.status(400).json({ error: 'Missing requestId or action' });
    }

    try {
        const status = action === 'approve' ? 'approved' : 'rejected';

        // Update request status
        const updateRequestSql = `
            UPDATE verification_requests 
            SET status = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2 
            RETURNING user_id
        `;
        const requestResult = await query(updateRequestSql, [status, requestId]);

        if (requestResult.rows.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        const userId = requestResult.rows[0].user_id;

        // If approved, update user status
        if (action === 'approve') {
            await query('UPDATE users SET is_verified = TRUE WHERE id = $1', [userId]);
        }

        // Send Push Notification for verification status
        await sendPushToUser(
            userId,
            action === 'approve' ? 'Verification Approved! 🎉' : 'Verification Update',
            action === 'approve'
                ? 'Congratulations! Your official verification badge has been approved.'
                : 'Your verification request has been rejected. You can try again after improving your profile.',
            { type: 'VERIFICATION_UPDATE', status }
        );

        res.json({ success: true, status });
    } catch (err) {
        console.error('Admin Verify Action Error:', err);
        res.status(500).json({ error: 'Server error processing verification action' });
    }
});

module.exports = router;
