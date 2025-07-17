export const POSTGRES_CONFIG = {
  connectionString: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/alignzo',
};

export const SERVER_PORT = process.env.PORT || 4000;

export const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'your_jwt_secret'; 