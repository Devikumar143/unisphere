const { query } = require('./db');

async function inspect() {
    try {
        console.log('Inspecting IDs...');
        const res = await query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name IN ('users', 'chat_messages') AND column_name = 'id'
            ORDER BY table_name;
        `);
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspect();
