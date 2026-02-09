const { query } = require('./db');

async function migrate() {
    try {
        console.log('Starting migration: create verification_requests table');
        await query(`
            CREATE TABLE IF NOT EXISTS verification_requests (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                full_name TEXT NOT NULL,
                category TEXT NOT NULL,
                document_url TEXT,
                status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Migration successful: verification_requests table created');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
