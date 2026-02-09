const express = require('express');
const router = express.Router();
const { query } = require('../db');

const { authenticateToken } = require('../middleware/auth');

// Get all active ads/posters (Public)
router.get('/', async (req, res) => {
    try {
        const sql = `
            SELECT * FROM ads 
            WHERE is_active = TRUE 
            ORDER BY created_at DESC
        `;
        const result = await query(sql);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching ads' });
    }
});

// Create a new ad/poster (Admin Only)
router.post('/', authenticateToken, async (req, res) => {
    const { title, imageUrl, redirectUrl, category } = req.body;

    if (!title || !imageUrl) {
        return res.status(400).json({ error: 'Title and Image URL are required' });
    }

    try {
        // Verify Admin Role
        const userRes = await query('SELECT role FROM users WHERE id = $1', [req.user.id]);
        if (userRes.rows.length === 0 || userRes.rows[0].role !== 'Admin') {
            return res.status(403).json({ error: 'Access denied. Admins only.' });
        }

        const sql = `
            INSERT INTO ads (title, image_url, redirect_url, category)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await query(sql, [title, imageUrl, redirectUrl, category || 'Ad']);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error creating ad:', err);
        res.status(500).json({ error: 'Server error creating ad' });
    }
});

// Delete an ad/poster (Admin Only)
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        // Verify Admin Role
        const userRes = await query('SELECT role FROM users WHERE id = $1', [req.user.id]);
        if (userRes.rows.length === 0 || userRes.rows[0].role !== 'Admin') {
            return res.status(403).json({ error: 'Access denied. Admins only.' });
        }

        await query('DELETE FROM ads WHERE id = $1', [id]);
        res.json({ success: true, message: 'Ad deleted successfully' });
    } catch (err) {
        console.error('Error deleting ad:', err);
        res.status(500).json({ error: 'Server error deleting ad' });
    }
});

module.exports = router;
