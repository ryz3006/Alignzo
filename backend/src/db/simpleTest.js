import pkg from 'pg';
const { Pool } = pkg;

const POSTGRES_CONFIG = {
  user: 'postgres',
  password: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'alignzo',
};

const pool = new Pool(POSTGRES_CONFIG);

const testAndCreate = async () => {
  try {
    console.log('Testing connection...');
    
    // Test connection
    const result = await pool.query('SELECT NOW() as time');
    console.log('✅ Connected to database:', result.rows[0].time);
    
    // Check if database exists
    const dbCheck = await pool.query(`
      SELECT datname FROM pg_database WHERE datname = 'alignzo';
    `);
    console.log('Database exists:', dbCheck.rows.length > 0);
    
    // Create admin_users table
    console.log('Creating admin_users table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ admin_users table created!');
    
    // Verify table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_users'
      );
    `);
    console.log('Table exists:', tableCheck.rows[0].exists);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
};

testAndCreate(); 