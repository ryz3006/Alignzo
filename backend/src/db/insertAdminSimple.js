import pkg from 'pg';
import bcrypt from 'bcrypt';
const { Pool } = pkg;

const POSTGRES_CONFIG = {
  user: 'postgres',
  password: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'alignzo',
};

const insertAdmin = async () => {
  const pool = new Pool(POSTGRES_CONFIG);
  
  try {
    console.log('Connecting to database...');
    
    const email = 'admin@alignzo.com';
    const password = 'admin';
    const name = 'Admin User';
    
    // Hash the password
    console.log('Hashing password...');
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Check if admin already exists
    console.log('Checking if admin exists...');
    const checkQuery = 'SELECT id FROM admin_users WHERE email = $1';
    const existingAdmin = await pool.query(checkQuery, [email]);
    
    if (existingAdmin.rows.length > 0) {
      console.log('✅ Admin user already exists!');
      return;
    }
    
    // Insert admin user
    console.log('Inserting admin user...');
    const insertQuery = `
      INSERT INTO admin_users (email, password_hash, name)
      VALUES ($1, $2, $3)
      RETURNING id, email, name, created_at;
    `;
    
    const result = await pool.query(insertQuery, [email, passwordHash, name]);
    
    console.log('✅ Admin user created successfully!');
    console.log('Admin Details:');
    console.log('- ID:', result.rows[0].id);
    console.log('- Email:', result.rows[0].email);
    console.log('- Name:', result.rows[0].name);
    console.log('- Created:', result.rows[0].created_at);
    console.log('\nLogin credentials:');
    console.log('- Email: admin@alignzo.com');
    console.log('- Password: admin');
    
  } catch (error) {
    console.error('❌ Error inserting admin user:', error.message);
  } finally {
    console.log('Closing database connection...');
    await pool.end();
    console.log('✅ Done!');
  }
};

console.log('Starting admin insertion...');
insertAdmin(); 