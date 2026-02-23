import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const initDb = async () => {
  try {
    const schemaPath = path.join(__dirname, '../src/config/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('Starting database initialization...');

    // Execute the schema SQL
    await pool.query(schema);

    console.log('Database schema pushed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

initDb();
