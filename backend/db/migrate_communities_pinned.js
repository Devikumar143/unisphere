const { query } = require('./index');

const migrate = async () => {
    try {
        console.log('Starting migration to add pinned_message_id to communities...');

        await query(`
            ALTER TABLE communities 
            ADD COLUMN IF NOT EXISTS pinned_message_id UUID REFERENCES chat_messages(id);
        `);
        console.log('✅ Added pinned_message_id column to communities table.');

        console.log('🎉 Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
};

migrate();
