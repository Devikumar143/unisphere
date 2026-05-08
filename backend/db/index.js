const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'unisphere',
        password: process.env.DB_PASSWORD || 'postgres',
        port: process.env.DB_PORT || 5432,
    };

const pool = new Pool({
    ...poolConfig,
    connectionTimeoutMillis: 5000, // 5 seconds timeout
    idleTimeoutMillis: 30000,    // 30 seconds idle timeout
});

// Pool error handling to prevent server crashes
pool.on('error', (err) => {
    console.error('Unexpected error on idle database client:', err.message);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
    connect: () => pool.connect(),
};
