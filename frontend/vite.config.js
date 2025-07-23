import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

const SSL_ENABLED = process.env.SSL_ENABLED === "false";
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || './certs/key.pem';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || './certs/cert.pem';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: SSL_ENABLED
    ? {
        https: {
          key: fs.readFileSync(SSL_KEY_PATH),
          cert: fs.readFileSync(SSL_CERT_PATH),
        },
        port: 5173,
        proxy: {
          '/api': 'http://localhost:4000',
          '/adminDashboard': 'http://localhost:4000',
        },
      }
    : {
        port: 5173,
        proxy: {
          '/api': 'http://localhost:4000',
          '/adminDashboard': 'http://localhost:4000',
        },
      },
});
