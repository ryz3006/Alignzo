import express from "express";
import jwt from "jsonwebtoken";
import pool from "../db/index.js";
import bcrypt from "bcrypt";
import { ADMIN_JWT_SECRET } from "../config.js";

const router = express.Router();

// Helper: ensure at least one admin exists (default: admin@alignzo.com/admin)
async function ensureDefaultAdmin() {
  const { rows } = await pool.query("SELECT COUNT(*) FROM admin_users");
  if (parseInt(rows[0].count, 10) === 0) {
    const hash = await bcrypt.hash("admin", 10);
    await pool.query(
      "INSERT INTO admin_users (email, password_hash, name) VALUES ($1, $2, $3)",
      ["admin@alignzo.com", hash, "Admin User"]
    );
  }
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    await ensureDefaultAdmin();
    const { rows } = await pool.query("SELECT * FROM admin_users WHERE email = $1", [email]);
    const admin = rows[0];
    if (!admin) return res.status(401).json({ error: "No account found for this email" });
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: "Incorrect password" });
    const token = jwt.sign({ adminId: admin.id, email: admin.email }, ADMIN_JWT_SECRET, { expiresIn: "1d" });
    res.json({ token });
  } catch (e) {
    console.error("Admin login error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router; 