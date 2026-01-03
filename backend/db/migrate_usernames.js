const { query } = require('./index');

const migrate = async () => {
    try {
        console.log('Starting username migration...');

        // 1. Add username column (nullable initially)
        await query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS username VARCHAR(50);
        `);
        console.log('Added username column.');

        // 2. Populate existing users
        const users = await query('SELECT id, email, full_name FROM users WHERE username IS NULL');

        for (const user of users.rows) {
            // Generate a basic username from email or name
            let baseName = user.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            let newUsername = baseName;
            let counter = 1;

            // Simple collision check (not perfect for heavy concurrency but fine for migration script)
            while (true) {
                const check = await query('SELECT id FROM users WHERE username = $1', [newUsername]);
                if (check.rows.length === 0) break;
                newUsername = `${baseName}${counter}`;
                counter++;
            }

            await query('UPDATE users SET username = $1 WHERE id = $2', [newUsername, user.id]);
            console.log(`Updated user ${user.email} -> ${newUsername}`);
        }

        // 3. Add UNIQUE constraint
        try {
            await query('ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username)');
        } catch (e) {
            // Ignore if already exists
            console.log('Constraint might already exist, skipping...');
        }

        console.log('Username migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    }
};

migrate();
