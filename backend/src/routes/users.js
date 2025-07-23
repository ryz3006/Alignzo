import express from "express";
import pool from "../db/index.js";
// You may need to import your Firebase admin SDK here for token verification
// import admin from 'firebase-admin';
const router = express.Router();

// Example: Get current user (to be protected by auth middleware)
router.get("/me", (req, res) => {
  res.json({ user: "placeholder" });
});

// Get projects assigned to the currently authenticated user
router.get("/my-projects", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid token" });
    }
    const idToken = authHeader.split(" ")[1];
    // TODO: Replace with actual Firebase token verification
    // const decoded = await admin.auth().verifyIdToken(idToken);
    // const userEmail = decoded.email;
    const userEmail = req.query.email || null; // REMOVE this fallback in prod
    if (!userEmail) return res.status(401).json({ error: "User email not found in token" });

    // Get user id
    const userResult = await pool.query("SELECT id, email FROM users WHERE email = $1", [userEmail]);
    if (userResult.rows.length === 0) {
      // Do NOT auto-create user. Just return error.
      return res.status(404).json({ error: "User not found. Please contact Admin." });
    }
    const userId = userResult.rows[0].id;

    // Get assigned projects
    const projectsResult = await pool.query(
      `SELECT p.id, p.name, p.status, pm.support_level
       FROM project_members pm
       JOIN projects p ON pm.project_id = p.id
       WHERE pm.user_id = $1`,
      [userId]
    );
    res.json({ projects: projectsResult.rows });
  } catch (e) {
    console.error("Error fetching user projects:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// User search for tagging
router.get('/', async (req, res) => {
  const { search } = req.query;
  if (!search || search.length < 2) return res.json({ users: [] });
  try {
    const result = await pool.query(
      `SELECT id, name, email FROM users WHERE 
        LOWER(email) LIKE LOWER($1) OR LOWER(name) LIKE LOWER($1)
        LIMIT 10`,
      [`%${search}%`]
    );
    res.json({ users: result.rows });
  } catch (e) {
    console.error('User search error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 