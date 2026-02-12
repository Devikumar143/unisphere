const { query } = require('./db/index');

async function checkSchema() {
    try {
        const result = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'ads'
        `);
        console.log('Ads Table Schema:');
        result.rows.forEach(col => {
            console.log(`- ${col.column_name}: ${col.data_type}`);
        });
        process.exit(0);
    } catch (err) {
        console.error('Error fetching schema:', err);
        process.exit(1);
    }
}

checkSchema();
