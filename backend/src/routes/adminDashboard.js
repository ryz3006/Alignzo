import express from "express";
import pool from "../db/index.js";
import adminAuth from "../middleware/adminAuth.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

const router = express.Router();

// Overview: Stat tiles for total users and projects
router.get("/stats", adminAuth, async (req, res) => {
  try {
    const usersResult = await pool.query("SELECT COUNT(*) FROM users");
    const projectsResult = await pool.query("SELECT COUNT(*) FROM projects");
    res.json({
      totalUsers: parseInt(usersResult.rows[0].count, 10),
      totalProjects: parseInt(projectsResult.rows[0].count, 10),
    });
  } catch (e) {
    console.error("Error fetching stats:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// User Hierarchy (org chart)
router.get("/users/hierarchy", adminAuth, async (req, res) => {
  try {
    // Fetch all users with their manager_id
    const { rows: users } = await pool.query(
      "SELECT id, name, email, role, manager_id FROM users"
    );

    // Build a map of users by id
    const userMap = {};
    users.forEach(user => {
      user.subordinates = [];
      userMap[user.id] = user;
    });

    // Build the hierarchy tree
    let roots = [];
    users.forEach(user => {
      if (user.manager_id && userMap[user.manager_id]) {
        userMap[user.manager_id].subordinates.push(user);
      } else {
        roots.push(user);
      }
    });

    res.json({ hierarchy: roots });
  } catch (e) {
    console.error("Error building user hierarchy:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Escalation Matrix
router.get("/projects/:projectId/escalation-matrix", adminAuth, async (req, res) => {
  const { projectId } = req.params;
  try {
    // Fetch all members for the project, including user info and manager_id
    const { rows: members } = await pool.query(
      `SELECT pm.id as project_member_id, u.id as user_id, u.name, u.email, u.role, u.manager_id, pm.designation
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

    // Helper: flatten tree by hierarchy, then sort by designation
    function flattenAndSort(nodes) {
      let result = [];
      nodes.sort((a, b) => (a.designation || '').localeCompare(b.designation || ''));
      for (const node of nodes) {
        result.push(node);
        if (node.subordinates && node.subordinates.length > 0) {
          result = result.concat(flattenAndSort(node.subordinates));
        }
      }
      return result;
    }

    const escalationMatrix = flattenAndSort(roots);
    res.json({ escalationMatrix });
  } catch (e) {
    console.error("Error building escalation matrix:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Export Reports
router.get("/export/:type", adminAuth, async (req, res) => {
  const { type } = req.params;
  const { format = "excel" } = req.query;

  try {
    let data = [];
    if (type === "users") {
      const { rows } = await pool.query("SELECT id, name, email, role, manager_id FROM users");
      data = rows;
    } else if (type === "projects") {
      const { rows } = await pool.query("SELECT id, name, description, status, user_id FROM projects");
      data = rows;
    } else if (type === "escalation-matrix") {
      const { projectId } = req.query;
      if (!projectId) return res.status(400).json({ error: "projectId required for escalation-matrix" });
      const { rows } = await pool.query(
        `SELECT pm.id as project_member_id, u.id as user_id, u.name, u.email, u.role, u.manager_id, pm.designation
         FROM project_members pm
         JOIN users u ON pm.user_id = u.id
         WHERE pm.project_id = $1`,
        [projectId]
      );
      data = rows;
    } else {
      return res.status(400).json({ error: "Invalid export type" });
    }

    if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Report");
      if (data.length > 0) {
        worksheet.columns = Object.keys(data[0]).map(key => ({ header: key, key }));
        worksheet.addRows(data);
      }
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=${type}_report.xlsx`);
      await workbook.xlsx.write(res);
      res.end();
    } else if (format === "pdf") {
      const doc = new PDFDocument();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=${type}_report.pdf`);
      doc.pipe(res);
      if (data.length > 0) {
        doc.fontSize(16).text(`${type.charAt(0).toUpperCase() + type.slice(1)} Report`, { align: 'center' });
        doc.moveDown();
        // Table header
        doc.fontSize(12).text(Object.keys(data[0]).join(' | '));
        doc.moveDown(0.5);
        // Table rows
        data.forEach(row => {
          doc.text(Object.values(row).join(' | '));
        });
      } else {
        doc.text('No data available');
      }
      doc.end();
    } else {
      return res.status(400).json({ error: "Invalid format. Use 'excel' or 'pdf'" });
    }
  } catch (e) {
    console.error("Error exporting report:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Seed test data (DEV ONLY)
router.post("/seed-test-data", async (req, res) => {
  if (process.env.NODE_ENV !== "development") {
    return res.status(403).json({ error: "Seeding only allowed in development mode" });
  }
  try {
    // Use ESM import for bcrypt
    const bcrypt = (await import('bcrypt')).default;
    // Seed users
    const users = [
      { name: "Alice Admin", email: "alice@alignzo.com", password: "admin123", role: "admin", manager_id: null },
      { name: "Bob User", email: "bob@alignzo.com", password: "user123", role: "user", manager_id: 1 },
      { name: "Carol Manager", email: "carol@alignzo.com", password: "manager123", role: "user", manager_id: 1 },
    ];
    const userIds = [];
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      const { rows } = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, manager_id) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [u.name, u.email, hash, u.role, u.manager_id]
      );
      userIds.push(rows[0].id);
    }
    // Seed projects
    const projects = [
      { name: "Project Alpha", description: "First project", user_id: userIds[0], status: "active" },
      { name: "Project Beta", description: "Second project", user_id: userIds[1], status: "completed" },
    ];
    const projectIds = [];
    for (const p of projects) {
      const { rows } = await pool.query(
        `INSERT INTO projects (name, description, user_id, status) VALUES ($1, $2, $3, $4) RETURNING id`,
        [p.name, p.description, p.user_id, p.status]
      );
      projectIds.push(rows[0].id);
    }
    // Seed settings
    const settings = [
      { key: "theme", value: "light" },
      { key: "company_name", value: "Alignzo" },
    ];
    for (const s of settings) {
      await pool.query(
        `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [s.key, s.value]
      );
    }
    res.json({ seeded: { users: userIds.length, projects: projectIds.length, settings: settings.length } });
  } catch (e) {
    console.error("Seed error:", e);
    res.status(500).json({ error: "Seed failed", details: e.message });
  }
});

// --- USERS CRUD ---
// List users with search and pagination
router.get("/users", adminAuth, async (req, res) => {
  const { search = "", page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    let usersQuery, params, countQuery, countParams;
    if (search) {
      usersQuery = `SELECT id, name, email, role, manager_id FROM users WHERE name ILIKE $1 OR email ILIKE $1 ORDER BY id DESC LIMIT $2 OFFSET $3`;
      params = [`%${search}%`, limit, offset];
      countQuery = `SELECT COUNT(*) FROM users WHERE name ILIKE $1 OR email ILIKE $1`;
      countParams = [`%${search}%`];
    } else {
      usersQuery = `SELECT id, name, email, role, manager_id FROM users ORDER BY id DESC LIMIT $1 OFFSET $2`;
      params = [limit, offset];
      countQuery = `SELECT COUNT(*) FROM users`;
      countParams = [];
    }
    const users = (await pool.query(usersQuery, params)).rows;
    const total = parseInt((await pool.query(countQuery, countParams)).rows[0].count, 10);
    res.json({ users, total });
  } catch (e) {
    console.error("Error listing users:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Create user
router.post("/users", adminAuth, async (req, res) => {
  const { name, email, password, role = "user", manager_id = null, project_ids = [] } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "Missing required fields" });
  try {
    const bcrypt = (await import('bcrypt')).default;
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, manager_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, manager_id`,
      [name, email, hash, role, manager_id]
    );
    const user = rows[0];
    // Assign projects (project_members)
    for (const project_id of project_ids) {
      await pool.query(
        `INSERT INTO project_members (user_id, project_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [user.id, project_id]
      );
    }
    res.status(201).json(user);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: "Email already exists" });
    console.error("Error creating user:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Update user
router.put("/users/:id", adminAuth, async (req, res) => {
  const { id } = req.params;
  const { name, email, role, manager_id, project_ids = [] } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE users SET name = $1, email = $2, role = $3, manager_id = $4, updated_at = NOW() WHERE id = $5 RETURNING id, name, email, role, manager_id`,
      [name, email, role, manager_id, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    // Update project assignments
    await pool.query(`DELETE FROM project_members WHERE user_id = $1`, [id]);
    for (const project_id of project_ids) {
      await pool.query(
        `INSERT INTO project_members (user_id, project_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [id, project_id]
      );
    }
    res.json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: "Email already exists" });
    console.error("Error updating user:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete user (prevent deletion if user is a project owner)
router.delete("/users/:id", adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    // Check if user is a project owner
    const { rows: projects } = await pool.query("SELECT id FROM projects WHERE user_id = $1", [id]);
    if (projects.length > 0) return res.status(400).json({ error: "Cannot delete user: user is a project owner" });
    const { rowCount } = await pool.query("DELETE FROM users WHERE id = $1", [id]);
    if (rowCount === 0) return res.status(404).json({ error: "User not found" });
    res.json({ success: true });
  } catch (e) {
    console.error("Error deleting user:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// --- PROJECTS CRUD ---
// List projects with search and pagination
router.get("/projects", adminAuth, async (req, res) => {
  const { search = "", page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    let projectsQuery, params, countQuery, countParams;
    if (search) {
      projectsQuery = `SELECT id, name, description, status, user_id FROM projects WHERE name ILIKE $1 OR description ILIKE $1 ORDER BY id DESC LIMIT $2 OFFSET $3`;
      params = [`%${search}%`, limit, offset];
      countQuery = `SELECT COUNT(*) FROM projects WHERE name ILIKE $1 OR description ILIKE $1`;
      countParams = [`%${search}%`];
    } else {
      projectsQuery = `SELECT id, name, description, status, user_id FROM projects ORDER BY id DESC LIMIT $1 OFFSET $2`;
      params = [limit, offset];
      countQuery = `SELECT COUNT(*) FROM projects`;
      countParams = [];
    }
    const projects = (await pool.query(projectsQuery, params)).rows;
    const total = parseInt((await pool.query(countQuery, countParams)).rows[0].count, 10);
    res.json({ projects, total });
  } catch (e) {
    console.error("Error listing projects:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Create project
router.post("/projects", adminAuth, async (req, res) => {
  let { name, description, user_id, status = "active", product_name, country } = req.body;
  if (!name) return res.status(400).json({ error: "Missing required fields" });
  // If no owner, set to admin user
  if (!user_id) {
    const adminUser = await pool.query(`SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1`);
    user_id = adminUser.rows[0]?.id;
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO projects (name, description, user_id, status, product_name, country) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, description, status, user_id, product_name, country`,
      [name, description, user_id, status, product_name, country]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error("Error creating project:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Update project
router.put("/projects/:id", adminAuth, async (req, res) => {
  const { id } = req.params;
  const { name, description, user_id, status, product_name, country } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE projects SET name = $1, description = $2, user_id = $3, status = $4, product_name = $5, country = $6, updated_at = NOW() WHERE id = $7 RETURNING id, name, description, status, user_id, product_name, country`,
      [name, description, user_id, status, product_name, country, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Project not found" });
    res.json(rows[0]);
  } catch (e) {
    console.error("Error updating project:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete project (prevent deletion if project has members)
router.delete("/projects/:id", adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    // Check if project has members
    const { rows: members } = await pool.query("SELECT id FROM project_members WHERE project_id = $1", [id]);
    if (members.length > 0) return res.status(400).json({ error: "Cannot delete project: project has members" });
    const { rowCount } = await pool.query("DELETE FROM projects WHERE id = $1", [id]);
    if (rowCount === 0) return res.status(404).json({ error: "Project not found" });
    res.json({ success: true });
  } catch (e) {
    console.error("Error deleting project:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// --- SETTINGS CRUD ---
// List all settings
router.get("/settings", adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, key, value, updated_at FROM settings ORDER BY key ASC");
    res.json({ settings: rows });
  } catch (e) {
    console.error("Error listing settings:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Get setting by key
router.get("/settings/:key", adminAuth, async (req, res) => {
  const { key } = req.params;
  try {
    const { rows } = await pool.query("SELECT id, key, value, updated_at FROM settings WHERE key = $1", [key]);
    if (rows.length === 0) return res.status(404).json({ error: "Setting not found" });
    res.json(rows[0]);
  } catch (e) {
    console.error("Error getting setting:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Create or update setting
router.post("/settings", adminAuth, async (req, res) => {
  const { key, value } = req.body;
  if (!key || value === undefined) return res.status(400).json({ error: "Missing key or value" });
  try {
    const { rows } = await pool.query(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
       RETURNING id, key, value, updated_at`,
      [key, value]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error("Error saving setting:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete setting
router.delete("/settings/:key", adminAuth, async (req, res) => {
  const { key } = req.params;
  try {
    const { rowCount } = await pool.query("DELETE FROM settings WHERE key = $1", [key]);
    if (rowCount === 0) return res.status(404).json({ error: "Setting not found" });
    res.json({ success: true });
  } catch (e) {
    console.error("Error deleting setting:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// --- SETTINGS: Product Names & Countries ---
// Get product names
router.get("/settings/product-names", adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'product_names'");
    if (rows.length === 0) {
      return res.json({ product_names: [] });
    }
    const product_names = JSON.parse(rows[0].value);
    res.json({ product_names });
  } catch (e) {
    console.error("Error fetching product names:", e);
    res.status(500).json({ error: "Server error" });
  }
});
// Set product names
router.post("/settings/product-names", adminAuth, async (req, res) => {
  const { product_names } = req.body;
  if (!Array.isArray(product_names)) return res.status(400).json({ error: "product_names must be array" });
  try {
    await pool.query(
      `INSERT INTO settings (key, value, updated_at) VALUES ('product_names', $1, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [JSON.stringify(product_names)]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});
// Get countries
router.get("/settings/countries", adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'countries'");
    if (rows.length === 0) {
      return res.json({ countries: [] });
    }
    const countries = JSON.parse(rows[0].value);
    res.json({ countries });
  } catch (e) {
    console.error("Error fetching countries:", e);
    res.status(500).json({ error: "Server error" });
  }
});
// Set countries
router.post("/settings/countries", adminAuth, async (req, res) => {
  const { countries } = req.body;
  if (!Array.isArray(countries)) return res.status(400).json({ error: "countries must be array" });
  try {
    await pool.query(
      `INSERT INTO settings (key, value, updated_at) VALUES ('countries', $1, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [JSON.stringify(countries)]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

// CRUD for Projects, Settings (skeletons)
// TODO: Add endpoints for CRUD with validation, search, pagination

// Catch-all for unmatched admin dashboard routes (404)
router.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default router; 