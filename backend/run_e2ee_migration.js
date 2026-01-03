const pool = require('./db');

async function runMigration() {
    try {
        console.log('Starting E2EE schema migration...\n');

        console.log('Creating identity_keys table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS identity_keys (
                user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                identity_key TEXT NOT NULL,
                registration_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Creating signed_prekeys table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS signed_prekeys (
                id SERIAL PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                key_id INTEGER NOT NULL,
                public_key TEXT NOT NULL,
                signature TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, key_id)
            )
        `);

        console.log('Creating prekeys table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS prekeys (
                id SERIAL PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                key_id INTEGER NOT NULL,
                public_key TEXT NOT NULL,
                used BOOLEAN DEFAULT FALSE,
                used_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, key_id)
            )
        `);

        console.log('Adding encryption columns to messages table...');
        try {
            await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS encrypted BOOLEAN DEFAULT FALSE`);
        } catch (e) { console.log('  encrypted column already exists'); }

        try {
            await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS prekey_id INTEGER`);
        } catch (e) { console.log('  prekey_id column already exists'); }

        try {
            await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS device_id INTEGER DEFAULT 1`);
        } catch (e) { console.log('  device_id column already exists'); }

        console.log('Creating indexes...');
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_prekeys_user_unused ON prekeys(user_id, used) WHERE used = FALSE`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_signed_prekeys_user ON signed_prekeys(user_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_identity_keys_user ON identity_keys(user_id)`);

        console.log('\n✅ E2EE schema migration completed successfully!\n');
        console.log('Created tables:');
        console.log('  - identity_keys');
        console.log('  - signed_prekeys');
        console.log('  - prekeys\n');
        console.log('Modified messages table with encryption columns\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration error:', error.message);
        console.error('\nDetails:', error);
        process.exit(1);
    }
}

runMigration();
