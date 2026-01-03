const { query } = require('./index');

const checkSchema = async () => {
    try {
        const res = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users';
        `);
        console.log('Columns in users table:', res.rows.map(r => r.column_name));
        process.exit(0);
    } catch (err) {
        console.error('Error checking schema:', err);
        process.exit(1);
    }
};

checkSchema();
