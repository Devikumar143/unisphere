const express = require('express');
const router = express.Router();
const { query } = require('../db');

// Get all active ads/posters
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

// Create a new ad/poster
router.post('/', async (req, res) => {
    const { title, imageUrl, redirectUrl, category } = req.body;

    if (!title || !imageUrl) {
        return res.status(400).json({ error: 'Title and Image URL are required' });
    }

    try {
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

// Delete an ad/poster
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await query('DELETE FROM ads WHERE id = $1', [id]);
        res.json({ success: true, message: 'Ad deleted successfully' });
    } catch (err) {
        console.error('Error deleting ad:', err);
        res.status(500).json({ error: 'Server error deleting ad' });
    }
});

module.exports = router;
