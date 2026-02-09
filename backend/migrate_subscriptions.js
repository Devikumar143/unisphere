const { query } = require('./db');

async function migrate() {
    console.log('Starting migration: Subscriptions...');
    try {
        // Add subscription columns to users
        await query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS subscription_type TEXT DEFAULT 'none',
            ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMP WITH TIME ZONE;
        `);
        console.log('Columns added to users table.');

        // Create subscriptions history table
        await query(`
            CREATE TABLE IF NOT EXISTS subscriptions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type TEXT NOT NULL, -- 'blue'
                amount DECIMAL(10, 2) NOT NULL,
                status TEXT DEFAULT 'active',
                started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Subscriptions table created.');

        console.log('Migration successful!');
    } catch (err) {
        console.error('Migration failed:', err);
    }
}

migrate();
