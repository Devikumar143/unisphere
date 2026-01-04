const pool = require('./index');

async function listTables() {
    try {
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Tables in database:', res.rows.map(row => row.table_name));
    } catch (err) {
        console.error('Error listing tables:', err);
    } finally {
        // pool.end() not strictly needed if we want to keep it open, but good for script
        process.exit();
    }
}

listTables();
