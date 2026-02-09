const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { sendPushToUser } = require('../services/pushService');
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
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Get All Posts (Feed)
router.get('/', async (req, res) => {
    const currentUserId = req.query.userId;

    try {
        const sql = `
            SELECT 
                p.id, 
                p.body as content, 
                p.media_urls,
                p.created_at,
                u.id as author_id,
                u.username,
                u.full_name as user_name, 
                u.role as user_role, 
                u.department as user_dept,
                u.bio_metadata,
                u.is_verified,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
                ${currentUserId ? `(SELECT COUNT(*) > 0 FROM likes WHERE post_id = p.id AND user_id = $1) as is_liked` : 'false as is_liked'},
                p.community_id,
                c.name as community_name
            FROM posts p
            JOIN users u ON p.author_id = u.id
            LEFT JOIN communities c ON p.community_id = c.id
            ORDER BY p.created_at DESC
        `;

        const params = currentUserId ? [currentUserId] : [];
        const result = await query(sql, params);

        // --- Shuffle-with-Bias Algorithm ---
        const shuffleArray = (array) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        };

        const now = new Date();
        const oneDay = 24 * 60 * 60 * 1000;
        const oneWeek = 7 * oneDay;

        const buckets = {
            today: [],
            thisWeek: [],
            older: []
        };

        result.rows.forEach(row => {
            const postDate = new Date(row.created_at);
            const diff = now - postDate;
            if (diff < oneDay) {
                buckets.today.push(row);
            } else if (diff < oneWeek) {
                buckets.thisWeek.push(row);
            } else {
                buckets.older.push(row);
            }
        });

        const randomizedRows = [
            ...shuffleArray(buckets.today),
            ...shuffleArray(buckets.thisWeek),
            ...shuffleArray(buckets.older)
        ];
        // ------------------------------------

        // Transform for frontend
        const posts = randomizedRows.map(post => ({
            id: post.id,
            user: {
                id: post.author_id,
                username: post.username,
                name: post.user_name,
                role: `${post.user_role} • ${post.user_dept}`,
                avatar: post.bio_metadata?.avatar || null,
                isVerified: post.is_verified
            },
            content: post.content,
            image: post.media_urls && post.media_urls.length > 0 ? post.media_urls[0] : null,
            time: new Date(post.created_at).toLocaleDateString(),
            community_name: post.community_name,
            community_id: post.community_id,
            stats: {
                likes: parseInt(post.likes_count),
                comments: parseInt(post.comments_count),
                isLiked: post.is_liked
            }
        }));

        res.json(posts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching posts' });
    }
});

// Helper to process mentions
const processMentions = async (content, senderId, entityId, type) => {
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const matches = content.match(mentionRegex);

    if (!matches) return;

    const usernames = matches.map(m => m.substring(1)); // Remove @
    const uniqueUsernames = [...new Set(usernames)];

    for (const username of uniqueUsernames) {
        try {
            const userRes = await query('SELECT id FROM users WHERE username = $1', [username]);
            if (userRes.rows.length > 0) {
                const recipientId = userRes.rows[0].id;

                // Don't notify self
                if (recipientId !== senderId) {
                    await query(
                        `INSERT INTO notifications (recipient_id, sender_id, type, entity_id, is_read) 
                         VALUES ($1, $2, 'MENTION', $3, FALSE)
                         ON CONFLICT DO NOTHING`,
                        [recipientId, senderId, entityId]
                    );

                    // Send push notification
                    const senderRes = await query('SELECT full_name FROM users WHERE id = $1', [senderId]);
                    const senderName = senderRes.rows[0]?.full_name || 'Someone';
                    await sendPushToUser(
                        recipientId,
                        'New Mention',
                        `${senderName} mentioned you in a post!`,
                        { type: 'MENTION', postId: entityId }
                    );
                }
            }
        } catch (err) {
            console.error('Error processing mention for', username, err);
        }
    }
};

// Upload Image
// Upload Media (Image/Video)
router.post('/upload-media', upload.single('media'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const protocol = req.get('x-forwarded-proto') || req.protocol;
        const fileUrl = `${protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        res.json({ url: fileUrl, type: req.file.mimetype });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to process upload' });
    }
});

// Get Reels (Video Posts)
router.get('/reels', async (req, res) => {
    try {
        const sql = `
            SELECT 
                p.id, 
                p.body as description, 
                p.media_urls,
                p.created_at,
                u.id as author_id,
                u.username,
                u.full_name as user_name,
                u.bio_metadata,
                u.is_verified,
                p.views,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
                 ${req.query.userId ? `(SELECT COUNT(*) > 0 FROM likes WHERE post_id = p.id AND user_id = $1) as is_liked` : 'false as is_liked'}
            FROM posts p
            JOIN users u ON p.author_id = u.id
            WHERE p.content_type = 'Reel'
            ORDER BY p.created_at DESC
        `;
        const params = req.query.userId ? [req.query.userId] : [];
        const result = await query(sql, params);

        const reels = result.rows.map(post => ({
            id: post.id,
            video: post.media_urls[0], // First URL is video
            user: {
                id: post.author_id,
                username: post.username,
                name: post.user_name,
                avatar: post.bio_metadata?.avatar || `https://ui-avatars.com/api/?name=${post.user_name}&background=random`,
                isVerified: post.is_verified
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
        res.status(500).json({ error: 'Server error fetching reels' });
    }
});

// Create Post (Text or Reel)
router.post('/', async (req, res) => {
    const { userId, content, mediaUrl, community_id, contentType = 'Text' } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const sql = `
            INSERT INTO posts (author_id, content_type, body, media_urls, community_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const result = await query(sql, [userId, contentType, content || '', mediaUrl ? [mediaUrl] : [], community_id || null]);
        const post = result.rows[0];

        // Process Mentions
        if (content) {
            await processMentions(content, userId, post.id, 'MENTION');
        }

        res.json(post);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error creating post' });
    }
});

// Toggle Like
router.post('/:id/like', async (req, res) => {
    const { userId } = req.body;
    const postId = req.params.id;

    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    try {
        // Check if liked
        const checkSql = 'SELECT * FROM likes WHERE user_id = $1 AND post_id = $2';
        const checkResult = await query(checkSql, [userId, postId]);

        if (checkResult.rows.length > 0) {
            // Unlike
            await query('DELETE FROM likes WHERE user_id = $1 AND post_id = $2', [userId, postId]);
            res.json({ liked: false });
        } else {
            // Like
            await query('INSERT INTO likes (user_id, post_id) VALUES ($1, $2)', [userId, postId]);

            // Get post author
            const postRes = await query('SELECT author_id FROM posts WHERE id = $1', [postId]);
            const authorId = postRes.rows[0].author_id;

            // Create Notification (if not self-like)
            if (authorId !== userId) {
                await query(
                    `INSERT INTO notifications (recipient_id, sender_id, type, entity_id) VALUES ($1, $2, 'LIKE', $3)`,
                    [authorId, userId, postId]
                );

                // Send push notification
                const likerRes = await query('SELECT full_name FROM users WHERE id = $1', [userId]);
                const likerName = likerRes.rows[0]?.full_name || 'Someone';
                await sendPushToUser(
                    authorId,
                    'New Like',
                    `${likerName} liked your post!`,
                    { type: 'LIKE', postId }
                );
            }

            res.json({ liked: true });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error toggling like' });
    }
});

// Add Comment
router.post('/:id/comments', async (req, res) => {
    const { userId, content } = req.body;
    const postId = req.params.id;

    if (!userId || !content) return res.status(400).json({ error: 'Missing fields' });

    try {
        const sql = `
            INSERT INTO comments (user_id, post_id, content) 
            VALUES ($1, $2, $3) 
            RETURNING id, content, created_at
        `;
        const result = await query(sql, [userId, postId, content]);

        // Get post author
        const postRes = await query('SELECT author_id FROM posts WHERE id = $1', [postId]);
        const authorId = postRes.rows[0].author_id;

        // Create Notification (if not self-comment)
        if (authorId !== userId) {
            await query(
                `INSERT INTO notifications (recipient_id, sender_id, type, entity_id) VALUES ($1, $2, 'COMMENT', $3)`,
                [authorId, userId, postId]
            );

            // Send push notification
            const commenterRes = await query('SELECT full_name FROM users WHERE id = $1', [userId]);
            const commenterName = commenterRes.rows[0]?.full_name || 'Someone';
            await sendPushToUser(
                authorId,
                'New Comment',
                `${commenterName} commented on your post!`,
                { type: 'COMMENT', postId }
            );
        }

        // Fetch user details for the response
        const userSql = 'SELECT full_name FROM users WHERE id = $1';
        const userResult = await query(userSql, [userId]);

        const comment = {
            ...result.rows[0],
            user_name: userResult.rows[0].full_name
        };

        // Process Mentions in Comment
        // We use the POST ID as the entity_id for navigation purposes, 
        // OR we could use the comment ID if we supported deep linking to comments.
        // For now, linking to the POST is safer.
        await processMentions(content, userId, postId, 'MENTION');

        res.json(comment);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error adding comment' });
    }
});

// Get Comments for a Post
router.get('/:id/comments', async (req, res) => {
    const postId = req.params.id;
    try {
        const sql = `
            SELECT c.id, c.content, c.created_at, u.full_name as user_name
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = $1
            ORDER BY c.created_at ASC
        `;
        const result = await query(sql, [postId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching comments' });
    }
});

// Delete a post
router.delete('/:id', async (req, res) => {
    try {
        const postId = req.params.id;
        const { userId } = req.body; // In a real app, get this from auth middleware

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Verify ownership
        const postCheck = await query('SELECT author_id FROM posts WHERE id = $1', [postId]);
        if (postCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        if (postCheck.rows[0].author_id !== userId) {
            return res.status(403).json({ error: 'You can only delete your own posts' });
        }

        // Delete related data (manually if no CASCADE)
        await query('DELETE FROM likes WHERE post_id = $1', [postId]);
        await query('DELETE FROM comments WHERE post_id = $1', [postId]);
        await query('DELETE FROM notifications WHERE entity_id = $1 AND (type = \'LIKE\' OR type = \'COMMENT\')', [postId]);

        // Delete the post
        await query('DELETE FROM posts WHERE id = $1', [postId]);

        res.json({ success: true, message: 'Post deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Increment View Count
router.post('/:id/view', async (req, res) => {
    const postId = req.params.id;
    try {
        await query('UPDATE posts SET views = COALESCE(views, 0) + 1 WHERE id = $1', [postId]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error incrementing view count:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
