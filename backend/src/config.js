export const POSTGRES_CONFIG = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'alignzo',
};

export const SERVER_PORT = process.env.PORT || 4000;

export const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'your_jwt_secret';

// SSL config
export const SSL_ENABLED = process.env.SSL_ENABLED === "false"; // default: false
export const SSL_KEY_PATH = process.env.SSL_KEY_PATH || "./certs/key.pem";
export const SSL_CERT_PATH = process.env.SSL_CERT_PATH || "./certs/cert.pem"; 