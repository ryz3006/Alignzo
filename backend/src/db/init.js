import pool from './index.js';

const createTables = async () => {
  try {
    console.log('Creating users table...');
    const usersTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        contact_number VARCHAR(32),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log(usersTableQuery);
    await pool.query(usersTableQuery);
    // Add contact_number column if not exists
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_number VARCHAR(32);`);
    console.log('✅ Users table created successfully');

    console.log('Creating projects table...');
    const projectsTableQuery = `
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log(projectsTableQuery);
    await pool.query(projectsTableQuery);
    console.log('✅ Projects table created successfully');

    console.log('Creating admin_users table...');
    const adminUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log(adminUsersTableQuery);
    await pool.query(adminUsersTableQuery);
    console.log('✅ Admin users table created successfully');

    console.log('Creating project_members table...');
    const projectMembersTableQuery = `
      CREATE TABLE IF NOT EXISTS project_members (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        support_level VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log(projectMembersTableQuery);
    await pool.query(projectMembersTableQuery);
    // Add support_level column if not exists
    await pool.query(`ALTER TABLE project_members ADD COLUMN IF NOT EXISTS support_level VARCHAR(10);`);
    console.log('✅ project_members table created successfully');

    console.log('Creating settings table...');
    const settingsTableQuery = `
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log(settingsTableQuery);
    await pool.query(settingsTableQuery);
    console.log('✅ settings table created successfully');

    console.log('Database tables created successfully!');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
};

const initDatabase = async () => {
  try {
    console.log('Initializing database...');
    await createTables();
    console.log('Database initialization completed!');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    await pool.end();
    process.exit(1);
  }
};

// Always run database initialization when this script is executed directly
initDatabase();

export { createTables, initDatabase }; 