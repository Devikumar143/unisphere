const { query } = require('./db/index');

async function checkData() {
    try {
        const result = await query(`
            SELECT id, name, created_by, pinned_message_id 
            FROM communities
        `);
        console.log('Communities Data:');
        result.rows.forEach(row => {
            console.log(`- ${row.name} (ID: ${row.id}): created_by=${row.created_by}, pinned=${row.pinned_message_id}`);
        });
        process.exit(0);
    } catch (err) {
        console.error('Error fetching data:', err);
        process.exit(1);
    }
}

checkData();
