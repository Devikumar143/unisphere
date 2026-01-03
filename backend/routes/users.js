const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { sendPushToUser } = require('../services/pushService');
const { onlineUsers } = require('../socketStore');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = 'uploads/';
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
            SELECT id, full_name, username, role, department, bio_metadata 
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
            isOnline: onlineUsers.has(user.id)
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
            avatar: user.bio_metadata?.avatar || null
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
            avatar: user.bio_metadata?.avatar || null
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

    // We keep existing metadata and merge new values
    try {
        // Validate username formatting if provided
        if (username && !/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
            return res.status(400).json({ error: 'Username must be 3-30 chars, alphanumeric or underscore.' });
        }

        // Check uniqueness if updating username
        if (username) {
            const check = await query('SELECT id FROM users WHERE username = $1 AND id != $2', [username, id]);
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

        const result = await query(sql, [name, department, metadata, username, id]);

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

// Upload Avatar
router.post('/:id/avatar', upload.single('avatar'), async (req, res) => {
    const { id } = req.params;
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const avatarUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

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

module.exports = router;
