const { query } = require('./db');

async function showUsers() {
    try {
        const res = await query('SELECT id, full_name, email, username, password_hash, role FROM users ORDER BY created_at DESC');
        console.log('--- USERS IN DATABASE ---');
        console.table(res.rows.map(u => ({
            Name: u.full_name,
            Email: u.email,
            Username: u.username,
            PasswordHash: u.password_hash ? u.password_hash.substring(0, 10) + '...' : 'N/A',
            Role: u.role
        })));

        console.log('\n--- COPIABLE DETAILS ---');
        res.rows.forEach(u => {
            console.log(`User: ${u.full_name} (${u.email})`);
            console.log(`Role: ${u.role}`);
            console.log(`Pass Hash: ${u.password_hash}`);
            console.log('-------------------');
        });

    } catch (err) {
        console.error('Database Error:', err);
    } finally {
        process.exit();
    }
}

showUsers();
