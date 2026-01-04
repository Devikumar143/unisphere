const { query } = require('./db');

const updateSchema = async () => {
    try {
        console.log('Adding pinned_message_id column to communities table...');
        await query(`
      ALTER TABLE communities 
      ADD COLUMN IF NOT EXISTS pinned_message_id UUID REFERENCES chat_messages(id);
    `);
        console.log('Successfully added pinned_message_id to communities table.');
    } catch (err) {
        console.error('Error updating schema:', err);
    }
};

updateSchema();
