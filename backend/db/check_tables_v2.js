const { query } = require('./index');

async function listTables() {
    try {
        const res = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        console.log('--- DATABASE TABLES ---');
        res.rows.forEach(row => console.log(row.table_name));
        console.log('-----------------------');
    } catch (err) {
        console.error('Error listing tables:', err);
    } finally {
        process.exit();
    }
}

listTables();
