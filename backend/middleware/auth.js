const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    const EXTRACT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

    jwt.verify(token, EXTRACT_SECRET, (err, user) => {
        if (err) {
            console.error('[AuthMiddleware] JWT Verification Failed:', err.message);
            return res.status(403).json({ error: 'Invalid token' });
        }
        console.log('[AuthMiddleware] Token verified for User ID:', user.id);
        req.user = user;
        next();
    });
};

module.exports = { authenticateToken };
