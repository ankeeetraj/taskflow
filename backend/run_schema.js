const fs = require('fs');
const path = require('path');
const { pool } = require('./src/config/db');

async function runSchema() {
  try {
    const schemaPath = path.join(__dirname, 'src', 'config', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('Schema executed successfully.');
  } catch (error) {
    console.error('Error executing schema:', error);
  } finally {
    pool.end();
  }
}

runSchema();
