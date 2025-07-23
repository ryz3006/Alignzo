import express from 'express';
import pool from '../db/index.js';
const router = express.Router();

// POST /api/posts - create a new post
router.post('/', async (req, res) => {
  try {
    const { author_email, project_id, content, type, images, tags } = req.body;
    if (!author_email || !project_id || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Insert post
    const postResult = await pool.query(
      'INSERT INTO posts (author_email, project_id, content, type) VALUES ($1, $2, $3, $4) RETURNING id',
      [author_email, project_id, content, type || 'post']
    );
    const postId = postResult.rows[0].id;
    // Insert images
    if (Array.isArray(images)) {
      for (const filePath of images) {
        await pool.query('INSERT INTO post_images (post_id, file_path) VALUES ($1, $2)', [postId, filePath]);
      }
    }
    // Insert tags
    if (Array.isArray(tags)) {
      for (const tagged_email of tags) {
        await pool.query('INSERT INTO post_tags (post_id, tagged_email) VALUES ($1, $2)', [postId, tagged_email]);
      }
    }
    res.json({ success: true, postId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// GET /api/posts?projectId=... - fetch posts for a project
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: 'Missing projectId' });
    // Fetch posts
    const postsResult = await pool.query('SELECT * FROM posts WHERE project_id = $1 ORDER BY created_at DESC', [projectId]);
    const posts = postsResult.rows;
    // For each post, fetch images and tags
    for (const post of posts) {
      const imagesResult = await pool.query('SELECT file_path FROM post_images WHERE post_id = $1', [post.id]);
      post.images = imagesResult.rows.map(r => r.file_path);
      const tagsResult = await pool.query('SELECT tagged_email FROM post_tags WHERE post_id = $1', [post.id]);
      post.tags = tagsResult.rows.map(r => r.tagged_email);
    }
    res.json({ posts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// --- Like a post ---
router.post('/:postId/like', async (req, res) => {
  const { postId } = req.params;
  const { user_email } = req.body;
  if (!user_email) return res.status(400).json({ error: 'Missing user_email' });
  try {
    await pool.query(
      'INSERT INTO post_likes (post_id, user_email) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [postId, user_email]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to like post' });
  }
});

// --- Unlike a post ---
router.delete('/:postId/like', async (req, res) => {
  const { postId } = req.params;
  const { user_email } = req.body;
  if (!user_email) return res.status(400).json({ error: 'Missing user_email' });
  try {
    await pool.query(
      'DELETE FROM post_likes WHERE post_id = $1 AND user_email = $2',
      [postId, user_email]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to unlike post' });
  }
});

// --- Get like count and user like status ---
router.get('/:postId/likes', async (req, res) => {
  const { postId } = req.params;
  const { user_email } = req.query;
  try {
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM post_likes WHERE post_id = $1',
      [postId]
    );
    let liked = false;
    if (user_email) {
      const userResult = await pool.query(
        'SELECT 1 FROM post_likes WHERE post_id = $1 AND user_email = $2',
        [postId, user_email]
      );
      liked = userResult.rows.length > 0;
    }
    res.json({ count: parseInt(countResult.rows[0].count, 10), liked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get like info' });
  }
});

export default router; 