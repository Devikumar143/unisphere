const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Register User
router.post('/register', async (req, res) => {
    const { fullName, email, password, department, role, username } = req.body;
    const cleanUsername = username ? username.trim() : null;

    if (!fullName || !email || !password || !cleanUsername) {
        return res.status(400).json({ error: 'Please provide all required fields' });
    }

    if (!/^[a-zA-Z0-9._]{3,30}$/.test(cleanUsername)) {
        return res.status(400).json({ error: 'Username must be 3-30 chars, alphanumeric, underscore or dot.' });
    }

    if (!email.toLowerCase().endsWith('@joyuniversity.edu.in')) {
        return res.status(400).json({ error: 'Registration is restricted to @joyuniversity.edu.in emails only' });
    }

    try {
        // Check if user exists (email or username)
        console.log('[Auth] Checking existence for Email:', email, 'Username:', cleanUsername);
        const userCheck = await query('SELECT id, email, username FROM users WHERE email = $1 OR username = $2', [email, cleanUsername]);
        if (userCheck.rows.length > 0) {
            console.log('[Auth] Duplicate found:', userCheck.rows[0]);
            return res.status(400).json({ error: 'User with this email or username already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUserMatches = await query(
            'INSERT INTO users (full_name, email, password_hash, role, department, username) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, full_name, email, role, username, is_verified, subscription_type, subscription_expiry',
            [fullName, email, passwordHash, role || 'Student', department, cleanUsername]
        );

        const newUser = newUserMatches.rows[0];

        // Generate Token
        const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            user: {
                ...newUser,
                isVerified: newUser.is_verified,
                subscriptionType: newUser.subscription_type,
                subscriptionExpiry: newUser.subscription_expiry
            }
        });
    } catch (err) {
        console.error('[Auth] Registration Error:', {
            message: err.message,
            stack: err.stack,
            code: err.code, // Useful for Postgres error codes
            detail: err.detail
        });
        res.status(500).json({ 
            error: `Server error: ${err.message}`
        });
    }
});

// Login User
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Please provide email and password' });
    }

    try {
        // Check user by email OR username
        const userResult = await query(
            'SELECT * FROM users WHERE email = $1 OR username = $2',
            [email, email.startsWith('@') ? email.substring(1) : email]
        );

        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const user = userResult.rows[0];

        // Check password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Generate Token
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.full_name,
                email: user.email,
                username: user.username,
                role: user.role,
                department: user.department,
                bio: user.bio_metadata?.bio,
                location: user.bio_metadata?.location,
                stats: user.bio_metadata?.stats,
                isVerified: user.is_verified,
                subscriptionType: user.subscription_type,
                subscriptionExpiry: user.subscription_expiry
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// University Email Verification (Legacy support for UI flow)
router.post('/verify', async (req, res) => {
    const { email } = req.body;
    // Simple check without DB for the initial screen
    const isVerified = email && email.toLowerCase().endsWith('@joyuniversity.edu.in');

    if (isVerified) {
        res.json({ success: true, message: 'Email verified' });
    } else {
        res.status(400).json({ success: false, message: 'Invalid university email' });
    }
});

module.exports = router;
