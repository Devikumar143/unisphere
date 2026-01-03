const { query } = require('./db');

async function inspect() {
    try {
        console.log('Inspecting chat_messages schema...');

        const res = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'chat_messages'
            ORDER BY ordinal_position;
        `);

        console.log('Columns in chat_messages:');
        res.rows.forEach(row => {
            console.log(`- ${row.column_name}: ${row.data_type}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspect();
