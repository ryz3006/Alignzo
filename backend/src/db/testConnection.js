import pool from './index.js';

const testConnection = async () => {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful!');
    console.log('Current time from database:', result.rows[0].current_time);
    
    // Test if admin_users table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_users'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ admin_users table exists');
      
      // Check if admin user already exists
      const adminCheck = await pool.query('SELECT COUNT(*) as count FROM admin_users WHERE email = $1', ['admin@alignzo.com']);
      console.log('Admin users with email admin@alignzo.com:', adminCheck.rows[0].count);
    } else {
      console.log('❌ admin_users table does not exist');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
};

testConnection(); 