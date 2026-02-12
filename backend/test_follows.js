const { query } = require('./db/index');

async function testFollows() {
    try {
        console.log('Testing query on "follows" table...');
        const res = await query('SELECT COUNT(*) FROM follows');
        console.log('Success! Result:', res.rows[0]);
    } catch (err) {
        console.error('Error querying "follows" table:', err);
    } finally {
        process.exit();
    }
}

testFollows();
