import pool from './index.js';
import bcrypt from 'bcrypt';

const insertAdminUser = async () => {
  try {
    const email = 'admin@alignzo.com';
    const password = 'admin';
    const name = 'Admin User';
    
    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Check if admin already exists
    const checkQuery = 'SELECT id FROM admin_users WHERE email = $1';
    const existingAdmin = await pool.query(checkQuery, [email]);
    
    if (existingAdmin.rows.length > 0) {
      console.log('Admin user already exists!');
      return;
    }
    
    // Insert admin user
    const insertQuery = `
      INSERT INTO admin_users (email, password_hash, name)
      VALUES ($1, $2, $3)
      RETURNING id, email, name, created_at;
    `;
    
    const result = await pool.query(insertQuery, [email, passwordHash, name]);
    
    console.log('Admin user created successfully!');
    console.log('Admin Details:');
    console.log('- ID:', result.rows[0].id);
    console.log('- Email:', result.rows[0].email);
    console.log('- Name:', result.rows[0].name);
    console.log('- Created:', result.rows[0].created_at);
    console.log('\nLogin credentials:');
    console.log('- Email: admin@alignzo.com');
    console.log('- Password: admin');
    
  } catch (error) {
    console.error('Error inserting admin user:', error);
    throw error;
  }
};

const runInsertAdmin = async () => {
  try {
    console.log('Inserting admin user...');
    await insertAdminUser();
    console.log('Admin user insertion completed!');
    process.exit(0);
  } catch (error) {
    console.error('Admin user insertion failed:', error);
    process.exit(1);
  }
};

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runInsertAdmin();
}

export { insertAdminUser }; 