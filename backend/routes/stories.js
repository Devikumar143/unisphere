const express = require('express');
const router = express.Router();
const { query } = require('../db');

// Get active stories
router.get('/', async (req, res) => {
    try {
        const sql = `
            SELECT s.*, u.full_name as name, u.bio_metadata->>'avatar' as avatar
            FROM stories s
            JOIN users u ON u.id = s.user_id
            WHERE s.expires_at > CURRENT_TIMESTAMP
            ORDER BY s.created_at DESC
        `;
        const result = await query(sql);

        // Group by user if needed, or return flat list
        // For standard UI, usually we group by user.
        const stories = result.rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            name: row.name,
            image: row.media_url,
            avatar: row.avatar,
            createdAt: row.created_at
        }));

        res.json(stories);
    } catch (err) {
        console.error('Error fetching stories:', err);
        res.status(500).json({ error: 'Server error fetching stories' });
    }
});

// Create a new story
router.post('/', async (req, res) => {
    const { userId, mediaUrl } = req.body;

    if (!userId || !mediaUrl) {
        return res.status(400).json({ error: 'User ID and Media URL are required' });
    }

    try {
        const sql = `
            INSERT INTO stories (user_id, media_url)
            VALUES ($1, $2)
            RETURNING *
        `;
        const result = await query(sql, [userId, mediaUrl]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating story:', err);
        res.status(500).json({ error: 'Server error creating story' });
    }
});

// Delete a story
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.query; // Ensure ownership

    try {
        const sql = 'DELETE FROM stories WHERE id = $1 AND user_id = $2 RETURNING *';
        const result = await query(sql, [id, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Story not found or unauthorized' });
        }

        res.json({ message: 'Story deleted successfully' });
    } catch (err) {
        console.error('Error deleting story:', err);
        res.status(500).json({ error: 'Server error deleting story' });
    }
});

module.exports = router;
