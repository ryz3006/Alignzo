import express from "express";
import jwt from "jsonwebtoken";
import pool from "../db/index.js";
import bcrypt from "bcrypt";
import { ADMIN_JWT_SECRET } from "../config.js";

const router = express.Router();

// Helper: ensure at least one admin exists (default: admin/admin)
async function ensureDefaultAdmin() {
  const { rows } = await pool.query("SELECT COUNT(*) FROM admins");
  if (parseInt(rows[0].count, 10) === 0) {
    const hash = await bcrypt.hash("admin", 10);
    await pool.query(
      "INSERT INTO admins (email, password_hash) VALUES ($1, $2)",
      ["admin", hash]
    );
  }
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    await ensureDefaultAdmin();
    const { rows } = await pool.query("SELECT * FROM admins WHERE email = $1", [email]);
    const admin = rows[0];
    if (!admin) return res.status(401).json({ error: "Invalid credentials" });
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ adminId: admin.id, email: admin.email }, ADMIN_JWT_SECRET, { expiresIn: "1d" });
    res.json({ token });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router; 