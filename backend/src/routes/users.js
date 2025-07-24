import express from "express";
import pool from "../db/index.js";
// You may need to import your Firebase admin SDK here for token verification
// import admin from 'firebase-admin';
const router = express.Router();

// Example: Get current user (to be protected by auth middleware)
router.get("/me", async (req, res) => {
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

    // Get user info
    const userResult = await pool.query("SELECT id, email, name, role, manager_id, designation, contact_number FROM users WHERE email = $1", [userEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found. Please contact Admin." });
    }
    const user = userResult.rows[0];
    res.json(user);
  } catch (e) {
    console.error("Error fetching user info:", e);
    res.status(500).json({ error: "Server error" });
  }
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

// Get project members for a project (user-accessible)
router.get('/project-members', async (req, res) => {
  const { projectId } = req.query;
  if (!projectId) return res.status(400).json({ error: 'projectId is required' });
  try {
    // Optionally: check user token here for auth
    const { rows: members } = await pool.query(
      `SELECT pm.id as project_member_id, u.id as user_id, u.name, u.email, u.role, u.manager_id, u.designation, u.contact_number, pm.support_level
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1`,
      [projectId]
    );
    // Build a map of users by id
    const userMap = {};
    members.forEach(member => {
      member.subordinates = [];
      userMap[member.user_id] = member;
    });
    // Build the hierarchy tree for project members
    let roots = [];
    members.forEach(member => {
      if (member.manager_id && userMap[member.manager_id]) {
        userMap[member.manager_id].subordinates.push(member);
      } else {
        roots.push(member);
      }
    });
    res.json({ members: roots });
  } catch (e) {
    console.error('Error fetching project members:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// User search for tagging
router.get('/', async (req, res) => {
  const { search, projectId } = req.query;
  if (!search || search.length < 2) return res.json({ users: [] });
  try {
    let result;
    if (projectId) {
      // Only users who are members of the given project
      result = await pool.query(
        `SELECT u.id, u.name, u.email FROM users u
         JOIN project_members pm ON pm.user_id = u.id
         WHERE pm.project_id = $2 AND (LOWER(u.email) LIKE LOWER($1) OR LOWER(u.name) LIKE LOWER($1))
         LIMIT 10`,
        [`%${search}%`, projectId]
      );
    } else {
      result = await pool.query(
        `SELECT id, name, email FROM users WHERE 
          LOWER(email) LIKE LOWER($1) OR LOWER(name) LIKE LOWER($1)
          LIMIT 10`,
        [`%${search}%`]
      );
    }
    res.json({ users: result.rows });
  } catch (e) {
    console.error('User search error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 