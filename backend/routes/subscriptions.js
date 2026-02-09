const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { sendPushToUser } = require('../services/pushService');

// Subscribe to UniSphere Blue (Simulated)
router.post('/subscribe', async (req, res) => {
    const { userId, plan = 'blue', durationMonths = 1 } = req.body;

    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    try {
        const amount = 4.99 * durationMonths; // $4.99/month
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + durationMonths);

        // Start transaction
        await query('BEGIN');

        // Update user
        await query(
            'UPDATE users SET subscription_type = $1, subscription_expiry = $2 WHERE id = $3',
            [plan, expiryDate, userId]
        );

        // Record history
        const subRes = await query(
            'INSERT INTO subscriptions (user_id, type, amount, expires_at) VALUES ($1, $2, $3, $4) RETURNING *',
            [userId, plan, amount, expiryDate]
        );

        await query('COMMIT');

        // Send Push Notification
        await sendPushToUser(
            userId,
            'UniSphere Blue Active!',
            'Thank you for subscribing! Your blue badge is now active.',
            { type: 'SUBSCRIPTION', status: 'active' }
        );

        res.json({
            success: true,
            subscription: subRes.rows[0],
            message: 'Successfully subscribed to UniSphere Blue!'
        });
    } catch (err) {
        await query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Server error processing subscription' });
    }
});

// Get Subscription Status
router.get('/status/:userId', async (req, res) => {
    try {
        const result = await query(
            'SELECT subscription_type, subscription_expiry FROM users WHERE id = $1',
            [req.params.userId]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        const user = result.rows[0];
        const now = new Date();
        const expiry = user.subscription_expiry ? new Date(user.subscription_expiry) : null;

        const isActive = expiry && expiry > now;

        res.json({
            subscriptionType: isActive ? user.subscription_type : 'none',
            expiry: user.subscription_expiry,
            isActive
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching status' });
    }
});

module.exports = router;
