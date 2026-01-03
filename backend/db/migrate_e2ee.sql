-- Signal Protocol End-to-End Encryption Schema

-- Identity keys (long-term keys for each user)
CREATE TABLE IF NOT EXISTS identity_keys (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    identity_key TEXT NOT NULL,
    registration_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Signed prekeys (medium-term, rotated weekly)
CREATE TABLE IF NOT EXISTS signed_prekeys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_id INTEGER NOT NULL,
    public_key TEXT NOT NULL,
    signature TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, key_id)
);

-- One-time prekeys (single-use for perfect forward secrecy)
CREATE TABLE IF NOT EXISTS prekeys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_id INTEGER NOT NULL,
    public_key TEXT NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, key_id)
);

-- Add encryption columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS encrypted BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS prekey_id INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS device_id INTEGER DEFAULT 1;

-- Index for faster prekey lookups
CREATE INDEX IF NOT EXISTS idx_prekeys_user_unused ON prekeys(user_id, used) WHERE used = FALSE;
CREATE INDEX IF NOT EXISTS idx_signed_prekeys_user ON signed_prekeys(user_id);
CREATE INDEX IF NOT EXISTS idx_identity_keys_user ON identity_keys(user_id);
