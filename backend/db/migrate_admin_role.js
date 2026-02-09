const { query } = require('./index');

async function promoteAdmin() {
    try {
        console.log('Promoting user to Admin...');

        // Update user 'viky' or the first user found to be Admin
        const result = await query(`
            UPDATE users 
            SET role = 'Admin' 
            WHERE username ILIKE 'viky' OR id = (SELECT id FROM users LIMIT 1)
            RETURNING id, full_name, username, role
        `);

        if (result.rows.length > 0) {
            console.log('✅ Promoted Users:', result.rows);
        } else {
            console.log('⚠️ No users found to promote.');
        }

    } catch (err) {
        console.error('❌ Promotion failed:', err);
    }
}

promoteAdmin();
