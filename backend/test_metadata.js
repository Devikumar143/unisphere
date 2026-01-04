const fetch = require('node-fetch');

async function testMetadata() {
    try {
        const response = await fetch('http://localhost:5000/api/metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: 'https://www.google.com' })
        });
        const data = await response.json();
        console.log('Metadata Response:', data);
    } catch (error) {
        console.error('Test Failed:', error);
    }
}

testMetadata();
