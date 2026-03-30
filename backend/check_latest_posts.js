const { query } = require('./db');

async function checkLatestPosts() {
    try {
        console.log('Fetching latest 5 posts...');
        const res = await query('SELECT id, body, media_urls, created_at FROM posts ORDER BY created_at DESC LIMIT 5');

        res.rows.forEach(post => {
            console.log(`--- Post ID: ${post.id} ---`);
            console.log(`Date: ${post.created_at}`);
            console.log(`Body: ${post.body.substring(0, 50)}${post.body.length > 50 ? '...' : ''}`);
            console.log(`Media URLs:`, post.media_urls);
            console.log('-------------------------');
        });
    } catch (err) {
        console.error('Error:', err);
    }
}

checkLatestPosts();
