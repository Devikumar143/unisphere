const { query } = require('./index');

const migrateLocation = async () => {
    const alterTableQuery = `
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS latitude FLOAT,
    ADD COLUMN IF NOT EXISTS longitude FLOAT,
    ADD COLUMN IF NOT EXISTS is_visible_on_map BOOLEAN DEFAULT FALSE;
  `;

    try {
        await query(alterTableQuery);
        console.log('Successfully added location columns to users table');
    } catch (err) {
        console.error('Error migrating location schema:', err);
    }
};

if (require.main === module) {
    migrateLocation();
}

module.exports = migrateLocation;
