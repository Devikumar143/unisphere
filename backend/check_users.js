const { query } = require('./db/index');

async function checkUsers() {
    try {
        const result = await query('SELECT id, full_name, username, role FROM users');
        console.log('Current Users:');
        result.rows.forEach(user => {
            console.log(`- ID: ${user.id}, Name: ${user.full_name}, Username: ${user.username}, Role: ${user.role}`);
        });
        process.exit(0);
    } catch (err) {
        console.error('Error fetching users:', err);
        process.exit(1);
    }
}

checkUsers();
