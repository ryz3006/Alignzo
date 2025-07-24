import 'dotenv/config';
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import fs from "fs";
import https from "https";
import { SERVER_PORT, SSL_ENABLED, SSL_KEY_PATH, SSL_CERT_PATH } from "./config.js";
import userRoutes from "./routes/users.js";
import projectRoutes from "./routes/projects.js";
import adminAuthRoutes from "./routes/adminAuth.js";
import adminDashboardRoutes from "./routes/adminDashboard.js";
import uploadRouter from './routes/upload.js';
import postsRouter from './routes/posts.js';
import path from 'path';
import ratingsRouter from './routes/ratings.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
// In development, relax rate limiting for login endpoint only
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // allow 1000 requests per 15 min in dev
  message: 'Too many login attempts, please try again later.'
});
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/admin/login', loginLimiter);
} else {
  // In production, you may want to use a stricter limiter globally
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
}
app.disable('x-powered-by');

// Set CORS header for all responses (including static files)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/admin", adminAuthRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use('/api/upload', uploadRouter);
app.use('/api/posts', postsRouter);
app.use('/api/ratings', ratingsRouter);
// Serve uploads statically WITH CORS
app.use('/uploads', cors(), express.static(path.join(process.cwd(), 'uploads')));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

if (SSL_ENABLED) {
  const sslOptions = {
    key: fs.readFileSync(SSL_KEY_PATH),
    cert: fs.readFileSync(SSL_CERT_PATH),
    secureOptions: require('constants').SSL_OP_NO_SSLv2 | require('constants').SSL_OP_NO_SSLv3,
    honorCipherOrder: true,
    ciphers: [
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-SHA256',
      'ECDHE-RSA-AES256-SHA384'
    ].join(':')
  };
  https.createServer(sslOptions, app).listen(SERVER_PORT, () =>
    console.log(`Backend running with SSL on port ${SERVER_PORT}`)
  );
} else {
  app.listen(SERVER_PORT, () =>
    console.log(`Backend running on port ${SERVER_PORT} (SSL disabled)`)
  );
} 