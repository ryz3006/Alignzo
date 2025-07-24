import express from 'express';
import ratingsDb from '../db/ratings.js';
import { isUserUnder } from '../db/users.js';

const router = express.Router();

// POST /api/ratings - Add a new rating
router.post('/', async (req, res) => {
  try {
    console.log('POST /api/ratings body:', req.body);
    const { project_id, rater_id, ratee_id, value, comment } = req.body;
    console.log('Parsed:', { project_id, rater_id, ratee_id, value, comment });
    if (!project_id || !rater_id || !ratee_id || typeof value !== 'number') {
      console.log('Missing required fields:', { project_id, rater_id, ratee_id, value });
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Authorization: Only allow if ratee is under rater in hierarchy
    const allowed = await isUserUnder(rater_id, ratee_id, project_id);
    if (!allowed) {
      return res.status(403).json({ error: 'Not authorized to rate this user' });
    }
    const rating = await ratingsDb.addRating({ project_id, rater_id, ratee_id, value, comment });
    res.json({ rating });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add rating', details: err.message });
  }
});

// PUT /api/ratings/:id - Update a rating (by author only)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rater_id, value, comment } = req.body;
    if (!rater_id || typeof value !== 'number') {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const rating = await ratingsDb.updateRating({ id, rater_id, value, comment });
    if (!rating) return res.status(404).json({ error: 'Rating not found or not authorized' });
    res.json({ rating });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update rating', details: err.message });
  }
});

// DELETE /api/ratings/:id - Delete a rating (by author only)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rater_id } = req.body;
    if (!rater_id) return res.status(400).json({ error: 'Missing rater_id' });
    const rating = await ratingsDb.deleteRating({ id, rater_id });
    if (!rating) return res.status(404).json({ error: 'Rating not found or not authorized' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete rating', details: err.message });
  }
});

// GET /api/ratings - List ratings (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { project_id, ratee_id, rater_id } = req.query;
    const ratings = await ratingsDb.fetchRatings({ project_id, ratee_id, rater_id });
    res.json({ ratings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ratings', details: err.message });
  }
});

// GET /api/leaderboard - Global or project leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { project_id, limit } = req.query;
    if (project_id) {
      const leaderboard = await ratingsDb.fetchProjectLeaderboard({ project_id, limit: limit ? Number(limit) : 20 });
      res.json({ leaderboard });
    } else {
      const leaderboard = await ratingsDb.fetchGlobalLeaderboard({ limit: limit ? Number(limit) : 20 });
      res.json({ leaderboard });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard', details: err.message });
  }
});

export default router; 