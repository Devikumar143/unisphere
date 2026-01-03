const { query } = require('./db');

async function promoteUser() {
    const email = process.argv[2];
    const role = process.argv[3] || 'Developer';

    if (!email) {
        console.log('Usage: node promote_user.js <email> [role]');
        console.log('Example: node promote_user.js student@university.edu Admin');
        process.exit(1);
    }

    try {
        const check = await query('SELECT id, full_name FROM users WHERE email = $1', [email]);

        if (check.rows.length === 0) {
            console.error(`Error: User with email "${email}" not found.`);
            process.exit(1);
        }

        const user = check.rows[0];
        await query('UPDATE users SET role = $2 WHERE id = $1', [user.id, role]);
        console.log(`Successfully promoted ${user.full_name} (${email}) to ${role}! 🚀`);
    } catch (err) {
        console.error('Database Error:', err);
    } finally {
        process.exit();
    }
}

promoteUser();
//node promote_user.js user@example.com
//To make someone an Admin: node promote_user.js user@example.com Admin
//To set someone back to a regular Student: node promote_user.js user@example.com Student