import db from './index.js';

// Add a new rating
async function addRating({ project_id, rater_id, ratee_id, value, comment }) {
  const result = await db.query(
    `INSERT INTO ratings (project_id, rater_id, ratee_id, value, comment)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [project_id, rater_id, ratee_id, value, comment]
  );
  return result.rows[0];
}

// Update a rating (by id and rater_id)
async function updateRating({ id, rater_id, value, comment }) {
  const result = await db.query(
    `UPDATE ratings SET value = $1, comment = $2, updated_at = NOW()
     WHERE id = $3 AND rater_id = $4
     RETURNING *`,
    [value, comment, id, rater_id]
  );
  return result.rows[0];
}

// Delete a rating (by id and rater_id)
async function deleteRating({ id, rater_id }) {
  const result = await db.query(
    `DELETE FROM ratings WHERE id = $1 AND rater_id = $2 RETURNING *`,
    [id, rater_id]
  );
  return result.rows[0];
}

// Fetch ratings (with optional filters)
async function fetchRatings({ project_id, ratee_id, rater_id }) {
  let query = `
    SELECT r.*, 
      ur.name AS rater_name, ur.email AS rater_email, 
      ue.name AS ratee_name, ue.email AS ratee_email
    FROM ratings r
    LEFT JOIN users ur ON r.rater_id = ur.id
    LEFT JOIN users ue ON r.ratee_id = ue.id
    WHERE 1=1
  `;
  const params = [];
  let idx = 1;
  if (project_id) {
    query += ` AND r.project_id = $${idx++}`;
    params.push(project_id);
  }
  if (ratee_id) {
    query += ` AND r.ratee_id = $${idx++}`;
    params.push(ratee_id);
  }
  if (rater_id) {
    query += ` AND r.rater_id = $${idx++}`;
    params.push(rater_id);
  }
  query += ' ORDER BY r.created_at DESC';
  const result = await db.query(query, params);
  return result.rows;
}

// Fetch global leaderboard (sum of ratings per user)
async function fetchGlobalLeaderboard({ limit = 20 } = {}) {
  const result = await db.query(
    `SELECT ratee_id AS user_id, SUM(value) AS total_rating
     FROM ratings
     GROUP BY ratee_id
     ORDER BY total_rating DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

// Fetch project-wise leaderboard
async function fetchProjectLeaderboard({ project_id, limit = 20 }) {
  const result = await db.query(
    `SELECT ratee_id AS user_id, SUM(value) AS total_rating
     FROM ratings
     WHERE project_id = $1
     GROUP BY ratee_id
     ORDER BY total_rating DESC
     LIMIT $2`,
    [project_id, limit]
  );
  return result.rows;
}

export default {
  addRating,
  updateRating,
  deleteRating,
  fetchRatings,
  fetchGlobalLeaderboard,
  fetchProjectLeaderboard,
}; 