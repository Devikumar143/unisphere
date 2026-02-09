const express = require('express');
const router = express.Router();

const GIPHY_BASE_URL = 'https://api.giphy.com/v1/gifs';

// trending
router.get('/v1/trending', async (req, res) => {
    try {
        const apiKey = process.env.GIPHY_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'GIPHY API Key not configured on server' });
        }

        const { limit = 20, rating = 'g' } = req.query;
        const response = await fetch(`${GIPHY_BASE_URL}/trending?api_key=${apiKey}&limit=${limit}&rating=${rating}`);
        const data = await response.json();

        res.json(data);
    } catch (error) {
        console.error('GIPHY Trending Error:', error);
        res.status(500).json({ error: 'Failed to fetch trending GIFs' });
    }
});

// search
router.get('/v1/search', async (req, res) => {
    try {
        const apiKey = process.env.GIPHY_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'GIPHY API Key not configured on server' });
        }

        const { q, limit = 20, rating = 'g' } = req.query;
        if (!q) return res.status(400).json({ error: 'Search query is required' });

        const response = await fetch(`${GIPHY_BASE_URL}/search?api_key=${apiKey}&q=${encodeURIComponent(q)}&limit=${limit}&rating=${rating}`);
        const data = await response.json();

        res.json(data);
    } catch (error) {
        console.error('GIPHY Search Error:', error);
        res.status(500).json({ error: 'Failed to search GIFs' });
    }
});

module.exports = router;
