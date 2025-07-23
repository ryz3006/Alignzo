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
      "SELECT id, name, email, role, manager_id, designation FROM users"
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

    // Helper: flatten tree by hierarchy, then sort by support_level (L1-L5)
    // Fetch support_levels order from settings
    let supportLevelsOrder = ["L1","L2","L3","L4","L5"];
    try {
      const { rows: slRows } = await pool.query("SELECT value FROM settings WHERE key = 'support_levels'");
      if (slRows.length > 0) supportLevelsOrder = JSON.parse(slRows[0].value);
    } catch {}

    function flattenAndSort(nodes) {
      let result = [];
      nodes.sort((a, b) => {
        const aIdx = supportLevelsOrder.indexOf(a.support_level || "");
        const bIdx = supportLevelsOrder.indexOf(b.support_level || "");
        if (aIdx !== bIdx) return aIdx - bIdx;
        return (a.designation || '').localeCompare(b.designation || '');
      });
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
    } else if (type === "users-detailed") {
      // User, Email, Designation, Manager Name, Manager Email Id
      const { rows } = await pool.query(`
        SELECT u.name as user, u.email, u.designation, m.name as manager_name, m.email as manager_email
        FROM users u
        LEFT JOIN users m ON u.manager_id = m.id
        ORDER BY u.id
      `);
      data = rows;
    } else if (type === "projects") {
      const { rows } = await pool.query("SELECT id, name, description, status, user_id FROM projects");
      data = rows;
    } else if (type === "escalation-matrix") {
      const { projectId } = req.query;
      if (!projectId) return res.status(400).json({ error: "projectId required for escalation-matrix" });
      const { rows } = await pool.query(
        `SELECT p.name as project_name, pm.support_level, u.name, u.email, u.contact_number, u.designation
         FROM project_members pm
         JOIN users u ON pm.user_id = u.id
         JOIN projects p ON pm.project_id = p.id
         WHERE pm.project_id = $1
         ORDER BY pm.support_level, u.name`,
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
      const doc = new PDFDocument({ margin: 36, size: 'A4' });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=${type}_report.pdf`);
      doc.pipe(res);
      if (data.length > 0) {
        // Title
        doc.fontSize(18).font('Helvetica-Bold').text(`${type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Report`, { align: 'center' });
        doc.moveDown(1.2);
        // Table header
        const headers = Object.keys(data[0]);
        // Responsive column widths
        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        let colWidth = Math.floor(pageWidth / headers.length);
        if (colWidth > 160) colWidth = 160; // max width per col
        if (colWidth < 80) { // reduce font size if too narrow
          doc.fontSize(9);
        } else {
          doc.fontSize(11);
        }
        const startX = doc.page.margins.left;
        let y = doc.y;
        doc.font('Helvetica-Bold');
        headers.forEach((header, i) => {
          doc.text(header, startX + i * colWidth, y, { width: colWidth, align: 'left' });
        });
        y += 20;
        doc.moveTo(startX, y - 4).lineTo(startX + headers.length * colWidth, y - 4).stroke();
        // Table rows
        doc.font('Helvetica');
        data.forEach(row => {
          // Calculate max height for this row
          let rowHeights = headers.map((header, i) => {
            const text = row[header] !== null && row[header] !== undefined ? String(row[header]) : '';
            return doc.heightOfString(text, { width: colWidth, align: 'left' });
          });
          const maxRowHeight = Math.max(...rowHeights, 16);
          // Render each cell
          headers.forEach((header, i) => {
            const text = row[header] !== null && row[header] !== undefined ? String(row[header]) : '';
            doc.text(text, startX + i * colWidth, y, { width: colWidth, align: 'left' });
          });
          y += maxRowHeight + 2;
          if (y > doc.page.height - doc.page.margins.bottom - 36) {
            doc.addPage();
            y = doc.page.margins.top;
          }
        });
        y += 12;
        doc.moveTo(startX, y - 4).lineTo(startX + headers.length * colWidth, y - 4).stroke();
        // Footer
        doc.fontSize(10).font('Helvetica-Oblique').fillColor('#888');
        const footerText = `Downloaded from Alignzo, at ${new Date().toLocaleString()}`;
        doc.text(footerText, startX, doc.page.height - 48, { align: 'left' });
        doc.fillColor('black');
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
      usersQuery = `SELECT id, name, email, role, manager_id, designation, contact_number FROM users WHERE name ILIKE $1 OR email ILIKE $1 ORDER BY id DESC LIMIT $2 OFFSET $3`;
      params = [`%${search}%`, limit, offset];
      countQuery = `SELECT COUNT(*) FROM users WHERE name ILIKE $1 OR email ILIKE $1`;
      countParams = [`%${search}%`];
    } else {
      usersQuery = `SELECT id, name, email, role, manager_id, designation, contact_number FROM users ORDER BY id DESC LIMIT $1 OFFSET $2`;
      params = [limit, offset];
      countQuery = `SELECT COUNT(*) FROM users`;
      countParams = [];
    }
    const users = (await pool.query(usersQuery, params)).rows;
    // Fetch project_ids for all users in one query
    const userIds = users.map(u => u.id);
    let projectMap = {};
    let supportLevelMap = {};
    if (userIds.length > 0) {
      const projectRows = (await pool.query(
        `SELECT user_id, project_id, support_level FROM project_members WHERE user_id = ANY($1)`,
        [userIds]
      )).rows;
      projectMap = userIds.reduce((acc, id) => { acc[id] = []; return acc; }, {});
      supportLevelMap = userIds.reduce((acc, id) => { acc[id] = {}; return acc; }, {});
      for (const row of projectRows) {
        if (!projectMap[row.user_id]) projectMap[row.user_id] = [];
        projectMap[row.user_id].push(row.project_id);
        if (!supportLevelMap[row.user_id]) supportLevelMap[row.user_id] = {};
        supportLevelMap[row.user_id][row.project_id] = row.support_level || null;
      }
    }
    // Attach project_ids and support_levels to each user
    users.forEach(u => {
      u.project_ids = projectMap[u.id] || [];
      u.support_levels = supportLevelMap[u.id] || {};
    });
    const total = parseInt((await pool.query(countQuery, countParams)).rows[0].count, 10);
    res.json({ users, total });
  } catch (e) {
    console.error("Error listing users:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Create user
router.post("/users", adminAuth, async (req, res) => {
  let { name, email, role = "user", manager_id = null, project_ids = [], designation = null, support_levels = {}, contact_number = null } = req.body;
  if (!name || !email) return res.status(400).json({ error: "Missing required fields" });
  // Convert empty string manager_id to null
  if (manager_id === "" || manager_id === undefined) manager_id = null;
  try {
    // No password required for Firebase users
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, manager_id, designation, contact_number) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, email, role, manager_id, designation, contact_number`,
      [name, email, null, role, manager_id, designation, contact_number]
    );
    const user = rows[0];
    // Assign projects (project_members) with support_level
    for (const project_id of project_ids) {
      await pool.query(
        `INSERT INTO project_members (user_id, project_id, support_level) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, project_id) DO UPDATE SET support_level = EXCLUDED.support_level`,
        [user.id, project_id, support_levels[project_id] || null]
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
  let { name, email, role, manager_id, project_ids = [], designation = null, support_levels = {}, contact_number = null } = req.body;
  // Convert empty string manager_id to null
  if (manager_id === "" || manager_id === undefined) manager_id = null;
  try {
    const { rows } = await pool.query(
      `UPDATE users SET name = $1, email = $2, role = $3, manager_id = $4, designation = $5, contact_number = $6, updated_at = NOW() WHERE id = $7 RETURNING id, name, email, role, manager_id, designation, contact_number`,
      [name, email, role, manager_id, designation, contact_number, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    // Update project assignments (with support_level)
    await pool.query(`DELETE FROM project_members WHERE user_id = $1`, [id]);
    for (const project_id of project_ids) {
      await pool.query(
        `INSERT INTO project_members (user_id, project_id, support_level) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, project_id) DO UPDATE SET support_level = EXCLUDED.support_level`,
        [id, project_id, support_levels[project_id] || null]
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
      projectsQuery = `SELECT p.id, p.name, p.description, p.status, p.user_id, p.product_name, p.country, u.email as owner_email FROM projects p LEFT JOIN users u ON p.user_id = u.id WHERE p.name ILIKE $1 OR p.description ILIKE $1 OR p.product_name ILIKE $1 OR p.country ILIKE $1 OR u.email ILIKE $1 ORDER BY p.id DESC LIMIT $2 OFFSET $3`;
      params = [`%${search}%`, limit, offset];
      countQuery = `SELECT COUNT(*) FROM projects p LEFT JOIN users u ON p.user_id = u.id WHERE p.name ILIKE $1 OR p.description ILIKE $1 OR p.product_name ILIKE $1 OR p.country ILIKE $1 OR u.email ILIKE $1`;
      countParams = [`%${search}%`];
    } else {
      projectsQuery = `SELECT p.id, p.name, p.description, p.status, p.user_id, p.product_name, p.country, u.email as owner_email FROM projects p LEFT JOIN users u ON p.user_id = u.id ORDER BY p.id DESC LIMIT $1 OFFSET $2`;
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

// --- DASHBOARD CHART DATA ENDPOINTS ---
// Projects by Product
router.get("/charts/projects-by-product", adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT product_name as label, COUNT(*) as value FROM projects GROUP BY product_name ORDER BY value DESC`
    );
    res.json(rows);
  } catch (e) {
    console.error("Error fetching projects by product:", e);
    res.status(500).json({ error: "Server error" });
  }
});
// Projects by Country
router.get("/charts/projects-by-country", adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT country as label, COUNT(*) as value FROM projects GROUP BY country ORDER BY value DESC`
    );
    res.json(rows);
  } catch (e) {
    console.error("Error fetching projects by country:", e);
    res.status(500).json({ error: "Server error" });
  }
});
// Projects by Status
router.get("/charts/projects-by-status", adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT status as label, COUNT(*) as value FROM projects GROUP BY status ORDER BY value DESC`
    );
    res.json(rows);
  } catch (e) {
    console.error("Error fetching projects by status:", e);
    res.status(500).json({ error: "Server error" });
  }
});
// Users by Designation
router.get("/charts/users-by-designation", adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT designation as label, COUNT(*) as value FROM users GROUP BY designation ORDER BY value DESC`
    );
    res.json(rows);
  } catch (e) {
    console.error("Error fetching users by designation:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// --- SETTINGS: Product Names & Countries & Designations ---
// (Move these above the generic /settings/:key route)

// Add middleware to disable ETag and set strong no-cache headers for all settings endpoints
router.use("/settings", (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.removeHeader && res.removeHeader('ETag');
  next();
});

// Get product names (accept trailing slash)
router.get(["/settings/product-names", "/settings/product-names/"], adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'product_names'");
    if (rows.length === 0) {
      return res.json({ product_names: [] });
    }
    const product_names = JSON.parse(rows[0].value);
    // Check usage for each product name
    const usageResults = await pool.query(
      `SELECT product_name, COUNT(*) as count FROM projects WHERE product_name = ANY($1) GROUP BY product_name`,
      [product_names]
    );
    const usageMap = {};
    usageResults.rows.forEach(row => {
      usageMap[row.product_name] = parseInt(row.count, 10) > 0;
    });
    const result = product_names.map(name => ({
      name,
      inUse: usageMap[name] || false
    }));
    res.json({ product_names: result });
  } catch (e) {
    console.error("Error fetching product names:", e);
    res.status(500).json({ error: "Server error" });
  }
});
// Set product names
router.post(["/settings/product-names", "/settings/product-names/"], adminAuth, async (req, res) => {
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
// Get countries (accept trailing slash)
router.get(["/settings/countries", "/settings/countries/"], adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'countries'");
    if (rows.length === 0) {
      return res.json({ countries: [] });
    }
    const countries = JSON.parse(rows[0].value);
    // Check usage for each country
    const usageResults = await pool.query(
      `SELECT country, COUNT(*) as count FROM projects WHERE country = ANY($1) GROUP BY country`,
      [countries]
    );
    const usageMap = {};
    usageResults.rows.forEach(row => {
      usageMap[row.country] = parseInt(row.count, 10) > 0;
    });
    const result = countries.map(name => ({
      name,
      inUse: usageMap[name] || false
    }));
    res.json({ countries: result });
  } catch (e) {
    console.error("Error fetching countries:", e);
    res.status(500).json({ error: "Server error" });
  }
});
// Set countries
router.post(["/settings/countries", "/settings/countries/"], adminAuth, async (req, res) => {
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
// Get designations (accept trailing slash)
router.get(["/settings/designations", "/settings/designations/"], adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'designations'");
    if (rows.length === 0) {
      return res.json({ designations: [] });
    }
    const designations = JSON.parse(rows[0].value);
    // Check usage for each designation
    const usageResults = await pool.query(
      `SELECT designation, COUNT(*) as count FROM users WHERE designation = ANY($1) GROUP BY designation`,
      [designations]
    );
    const usageMap = {};
    usageResults.rows.forEach(row => {
      usageMap[row.designation] = parseInt(row.count, 10) > 0;
    });
    const result = designations.map(name => ({
      name,
      inUse: usageMap[name] || false
    }));
    res.json({ designations: result });
  } catch (e) {
    console.error("Error fetching designations:", e);
    res.status(500).json({ error: "Server error" });
  }
});
// Set designations
router.post(["/settings/designations", "/settings/designations/"], adminAuth, async (req, res) => {
  const { designations } = req.body;
  if (!Array.isArray(designations)) return res.status(400).json({ error: "designations must be array" });
  try {
    await pool.query(
      `INSERT INTO settings (key, value, updated_at) VALUES ('designations', $1, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [JSON.stringify(designations)]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

// --- SETTINGS: Support Levels ---
// Get support levels (accept trailing slash)
router.get(["/settings/support-levels", "/settings/support-levels/"], adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'support_levels'");
    if (rows.length === 0) {
      return res.json({ support_levels: [] });
    }
    const support_levels = JSON.parse(rows[0].value);
    res.json({ support_levels });
  } catch (e) {
    console.error("Error fetching support levels:", e);
    res.status(500).json({ error: "Server error" });
  }
});
// Set support levels
router.post(["/settings/support-levels", "/settings/support-levels/"], adminAuth, async (req, res) => {
  const { support_levels } = req.body;
  if (!Array.isArray(support_levels)) return res.status(400).json({ error: "support_levels must be array" });
  try {
    await pool.query(
      `INSERT INTO settings (key, value, updated_at) VALUES ('support_levels', $1, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [JSON.stringify(support_levels)]
    );
    res.json({ success: true });
  } catch (e) {
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
// Get setting by key (generic, must be last)
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

// CRUD for Projects, Settings (skeletons)
// TODO: Add endpoints for CRUD with validation, search, pagination

// Catch-all for unmatched admin dashboard routes (404)
router.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default router; 