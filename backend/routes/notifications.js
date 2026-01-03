const express = require('express');
const router = express.Router();
const { query } = require('../db');

// GET /notifications - Fetch notifications for the logged-in user
router.get('/', async (req, res) => {
    // Expect user_id in headers for MVP auth
    const userId = req.headers['user-id'];

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const result = await query(`
            SELECT 
                n.id, 
                n.type, 
                n.is_read, 
                n.created_at,
                n.entity_id,
                u.id as sender_id,
                u.full_name as sender_name,
                u.bio_metadata->>'avatar' as sender_avatar
            FROM notifications n
            JOIN users u ON n.sender_id = u.id
            WHERE n.recipient_id = $1
            ORDER BY n.created_at DESC
            LIMIT 50
        `, [userId]);

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /notifications/:id/read - Mark a notification as read
router.post('/:id/read', async (req, res) => {
    const { id } = req.params;
    const userId = req.headers['user-id'];

    try {
        await query(
            'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND recipient_id = $2',
            [id, userId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error marking notification read:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /notifications/mark-all-read - Mark all as read
router.post('/mark-all-read', async (req, res) => {
    const userId = req.headers['user-id'];

    try {
        await query(
            'UPDATE notifications SET is_read = TRUE WHERE recipient_id = $1',
            [userId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error marking all read:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
