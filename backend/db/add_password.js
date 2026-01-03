const { query } = require('../db');

const addPasswordColumn = async () => {
    const sql = `
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NOT NULL DEFAULT 'temp_hash';
    `;
    try {
        await query(sql);
        console.log('Successfully added password_hash column to users table.');
    } catch (err) {
        console.error('Error adding password column:', err);
    }
};

addPasswordColumn();
