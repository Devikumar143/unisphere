const express = require('express');
const router = express.Router();
const pool = require('../db');

// Store user's identity key
router.post('/identity', async (req, res) => {
    try {
        const { userId, identityKey, registrationId } = req.body;

        if (!userId || !identityKey || !registrationId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await pool.query(
            `INSERT INTO identity_keys (user_id, identity_key, registration_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id) 
             DO UPDATE SET identity_key = $2, registration_id = $3, updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [userId, identityKey, registrationId]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error storing identity key:', error);
        res.status(500).json({ error: 'Failed to store identity key' });
    }
});

// Upload batch of prekeys
router.post('/prekeys', async (req, res) => {
    try {
        const { userId, prekeys } = req.body;

        if (!userId || !Array.isArray(prekeys) || prekeys.length === 0) {
            return res.status(400).json({ error: 'Invalid prekeys data' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const prekey of prekeys) {
                await client.query(
                    `INSERT INTO prekeys (user_id, key_id, public_key)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (user_id, key_id) DO NOTHING`,
                    [userId, prekey.keyId, prekey.publicKey]
                );
            }

            await client.query('COMMIT');
            res.json({ success: true, count: prekeys.length });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error storing prekeys:', error);
        res.status(500).json({ error: 'Failed to store prekeys' });
    }
});

// Upload signed prekey
router.post('/signed-prekey', async (req, res) => {
    try {
        const { userId, keyId, publicKey, signature } = req.body;

        if (!userId || !keyId || !publicKey || !signature) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await pool.query(
            `INSERT INTO signed_prekeys (user_id, key_id, public_key, signature)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, key_id) 
             DO UPDATE SET public_key = $3, signature = $4, created_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [userId, keyId, publicKey, signature]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error storing signed prekey:', error);
        res.status(500).json({ error: 'Failed to store signed prekey' });
    }
});

// Get user's prekey bundle for session initialization
router.get('/bundle/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Get identity key
        const identityResult = await pool.query(
            'SELECT identity_key, registration_id FROM identity_keys WHERE user_id = $1',
            [userId]
        );

        if (identityResult.rows.length === 0) {
            return res.status(404).json({ error: 'User has not set up encryption' });
        }

        // Get signed prekey (most recent)
        const signedPrekeyResult = await pool.query(
            'SELECT key_id, public_key, signature FROM signed_prekeys WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
            [userId]
        );

        if (signedPrekeyResult.rows.length === 0) {
            return res.status(404).json({ error: 'No signed prekey available' });
        }

        // Get one unused prekey and mark it as used
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const prekeyResult = await client.query(
                `UPDATE prekeys 
                 SET used = TRUE, used_at = CURRENT_TIMESTAMP
                 WHERE id = (
                     SELECT id FROM prekeys 
                     WHERE user_id = $1 AND used = FALSE 
                     ORDER BY created_at ASC 
                     LIMIT 1
                     FOR UPDATE SKIP LOCKED
                 )
                 RETURNING key_id, public_key`,
                [userId]
            );

            await client.query('COMMIT');

            const bundle = {
                identityKey: identityResult.rows[0].identity_key,
                registrationId: identityResult.rows[0].registration_id,
                signedPreKey: {
                    keyId: signedPrekeyResult.rows[0].key_id,
                    publicKey: signedPrekeyResult.rows[0].public_key,
                    signature: signedPrekeyResult.rows[0].signature
                },
                preKey: prekeyResult.rows.length > 0 ? {
                    keyId: prekeyResult.rows[0].key_id,
                    publicKey: prekeyResult.rows[0].public_key
                } : null
            };

            res.json(bundle);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error fetching prekey bundle:', error);
        res.status(500).json({ error: 'Failed to fetch prekey bundle' });
    }
});

// Get prekey count for a user (to know when to upload more)
router.get('/prekey-count/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await pool.query(
            'SELECT COUNT(*) as count FROM prekeys WHERE user_id = $1 AND used = FALSE',
            [userId]
        );

        res.json({ count: parseInt(result.rows[0].count) });
    } catch (error) {
        console.error('Error getting prekey count:', error);
        res.status(500).json({ error: 'Failed to get prekey count' });
    }
});

module.exports = router;
