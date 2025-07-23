# Database Setup Guide

## PostgreSQL Configuration

This project is configured to use PostgreSQL with the following default settings:

- **Host**: localhost
- **Port**: 5432
- **Username**: postgres
- **Password**: postgres
- **Database**: alignzo

## Setup Instructions

### 1. Install PostgreSQL

Make sure PostgreSQL is installed and running on your system.

### 2. Create Database

Connect to PostgreSQL and create the database:

```sql
CREATE DATABASE alignzo;
```

### 3. Environment Variables (Optional)

You can override the default database settings by setting environment variables:

```bash
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=alignzo
```

### 4. Initialize Database Tables

Run the database initialization script to create the required tables:

```bash
npm run init-db
```

This will create the following tables:
- `users` - User accounts and authentication
- `projects` - Project data linked to users
- `admin_users` - Admin user accounts

### 5. Start the Application

```bash
npm run dev
```

## Database Schema

### Users Table
- `id` - Primary key
- `email` - Unique email address
- `password_hash` - Hashed password
- `name` - User's full name
- `role` - User role (default: 'user')
- `created_at` - Timestamp
- `updated_at` - Timestamp

### Projects Table
- `id` - Primary key
- `name` - Project name
- `description` - Project description
- `user_id` - Foreign key to users table
- `status` - Project status (default: 'active')
- `created_at` - Timestamp
- `updated_at` - Timestamp

### Admin Users Table
- `id` - Primary key
- `email` - Unique email address
- `password_hash` - Hashed password
- `name` - Admin's full name
- `created_at` - Timestamp
- `updated_at` - Timestamp 