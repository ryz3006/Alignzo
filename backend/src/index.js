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

const app = express();
app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.disable('x-powered-by');

app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/admin", adminAuthRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);

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