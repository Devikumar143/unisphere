const express = require('express');
const router = express.Router();
const { query } = require('../db');

// Get all communities (with search and joined status)
router.get('/', async (req, res) => {
    const userId = req.query.userId;
    const searchQuery = req.query.query;
    try {
        let sql = `
            SELECT 
                c.*,
                (SELECT COUNT(*) FROM community_members WHERE community_id = c.id) as member_count,
                ${userId ? `(SELECT COUNT(*) > 0 FROM community_members WHERE community_id = c.id AND user_id = $1) as is_member` : 'false as is_member'},
                (
                    SELECT JSONB_AGG(m) FROM (
                        SELECT u.full_name, u.id, u.bio_metadata->>'avatar' as avatar FROM community_members cm
                        JOIN users u ON cm.user_id = u.id
                        WHERE cm.community_id = c.id
                        ORDER BY cm.joined_at DESC
                        LIMIT 5
                    ) m
                ) as member_previews
            FROM communities c
        `;

        const params = userId ? [userId] : [];

        if (searchQuery) {
            sql += ` WHERE c.name ILIKE $${params.length + 1} OR c.description ILIKE $${params.length + 1}`;
            params.push(`%${searchQuery}%`);
        }

        sql += ` ORDER BY c.created_at DESC`;

        const result = await query(sql, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching communities' });
    }
});

// Create a community
router.post('/', async (req, res) => {
    const { name, description, icon, type, userId } = req.body;
    try {
        const sql = `
            INSERT INTO communities (name, description, icon, type, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const result = await query(sql, [name, description, icon, type || 'Club', userId]);
        const community = result.rows[0];

        // Add creator as admin
        await query(
            `INSERT INTO community_members (community_id, user_id, role) VALUES ($1, $2, 'admin')`,
            [community.id, userId]
        );

        res.json(community);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error creating community' });
    }
});

// Join Community
router.post('/:id/join', async (req, res) => {
    const communityId = req.params.id;
    const { userId } = req.body;
    try {
        await query(
            `INSERT INTO community_members (community_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [communityId, userId]
        );
        res.json({ success: true, is_member: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error joining community' });
    }
});

// Leave Community
router.post('/:id/leave', async (req, res) => {
    const communityId = req.params.id;
    const { userId } = req.body;
    try {
        await query(
            `DELETE FROM community_members WHERE community_id = $1 AND user_id = $2`,
            [communityId, userId]
        );
        res.json({ success: true, is_member: false });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error leaving community' });
    }
});

// Get Community Details
router.get('/:id', async (req, res) => {
    const communityId = req.params.id;
    const userId = req.query.userId;
    try {
        const sql = `
            SELECT 
                c.*,
                (SELECT COUNT(*) FROM community_members WHERE community_id = c.id) as member_count,
                 ${userId ? `(SELECT COUNT(*) > 0 FROM community_members WHERE community_id = c.id AND user_id = $2) as is_member` : 'false as is_member'},
                 ${userId ? `(SELECT role FROM community_members WHERE community_id = c.id AND user_id = $2) as user_role` : 'NULL as user_role'},
                (
                    SELECT json_build_object('id', u.id, 'name', u.full_name, 'avatar', u.bio_metadata->>'avatar')
                    FROM users u WHERE u.id = c.created_by
                ) as admin_details,
                (
                    SELECT JSONB_AGG(m) FROM (
                        SELECT u.full_name, u.id FROM community_members cm
                        JOIN users u ON cm.user_id = u.id
                        WHERE cm.community_id = c.id
                        ORDER BY cm.joined_at DESC
                        LIMIT 10
                    ) m
                ) as member_previews
            FROM communities c
            WHERE c.id = $1
        `;
        const params = userId ? [communityId, userId] : [communityId];
        const result = await query(sql, params);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Community not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching community' });
    }
});

// Get Community Posts
router.get('/:id/posts', async (req, res) => {
    const communityId = req.params.id;
    const currentUserId = req.query.userId;
    try {
        const sql = `
            SELECT 
                p.id, 
                p.body as content, 
                p.media_urls,
                p.created_at,
                u.id as user_id,
                u.full_name as user_name, 
                u.role as user_role, 
                u.department as user_dept,
                u.bio_metadata,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
                ${currentUserId ? `(SELECT COUNT(*) > 0 FROM likes WHERE post_id = p.id AND user_id = $2) as is_liked` : 'false as is_liked'}
            FROM posts p
            JOIN users u ON p.author_id = u.id
            WHERE p.community_id = $1
            ORDER BY p.created_at DESC
        `;

        const params = currentUserId ? [communityId, currentUserId] : [communityId];
        const result = await query(sql, params);

        const posts = result.rows.map(post => ({
            id: post.id,
            user: {
                id: post.user_id,
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
        res.status(500).json({ error: 'Server error fetching community posts' });
    }
});

// Update Community
router.patch('/:id', async (req, res) => {
    const communityId = req.params.id;
    const { name, description, icon, userId } = req.body;
    try {
        // Check if user is the creator
        const checkSql = `SELECT created_by FROM communities WHERE id = $1`;
        const checkResult = await query(checkSql, [communityId]);
        if (checkResult.rows.length === 0) return res.status(404).json({ error: 'Community not found' });
        if (checkResult.rows[0].created_by !== userId) return res.status(403).json({ error: 'Unauthorized' });

        const sql = `
            UPDATE communities 
            SET name = COALESCE($1, name), 
                description = COALESCE($2, description), 
                icon = COALESCE($3, icon)
            WHERE id = $4
            RETURNING *
        `;
        const result = await query(sql, [name, description, icon, communityId]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error updating community' });
    }
});

// Delete Community
router.delete('/:id', async (req, res) => {
    const communityId = req.params.id;
    const { userId } = req.body;
    try {
        // Check if user is the creator
        const checkSql = `SELECT created_by FROM communities WHERE id = $1`;
        const checkResult = await query(checkSql, [communityId]);
        if (checkResult.rows.length === 0) return res.status(404).json({ error: 'Community not found' });
        if (checkResult.rows[0].created_by !== userId) return res.status(403).json({ error: 'Unauthorized' });

        // Delete dependencies (comments, likes, posts, members)
        // Cleanup Comments and Likes on Posts FIRST
        await query(`DELETE FROM comments WHERE post_id IN (SELECT id FROM posts WHERE community_id = $1)`, [communityId]);
        await query(`DELETE FROM likes WHERE post_id IN (SELECT id FROM posts WHERE community_id = $1)`, [communityId]);

        // Cleanup Posts
        await query(`DELETE FROM posts WHERE community_id = $1`, [communityId]);

        // Cleanup Members
        await query(`DELETE FROM community_members WHERE community_id = $1`, [communityId]);

        // Finally Delete Community
        await query(`DELETE FROM communities WHERE id = $1`, [communityId]);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error deleting community' });
    }
});

module.exports = router;
