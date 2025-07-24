import express from 'express';
import pool from '../db/index.js';
import adminAuth from '../middleware/adminAuth.js';
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
    // Insert tags (now using user_id)
    if (Array.isArray(tags)) {
      for (const user_id of tags) {
        await pool.query('INSERT INTO post_tags (post_id, user_id) VALUES ($1, $2)', [postId, user_id]);
      }
    }
    res.json({ success: true, postId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create post', details: err.message });
  }
});

// GET /api/posts?projectId=... - fetch posts for a project
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.query;
    console.log('[DEBUG] GET /api/posts - projectId:', projectId);
    if (!projectId) return res.status(400).json({ error: 'Missing projectId' });
    // Fetch posts
    const postsResult = await pool.query('SELECT * FROM posts WHERE project_id = $1 ORDER BY created_at DESC', [projectId]);
    const posts = postsResult.rows;
    console.log(`[DEBUG] Found ${posts.length} posts for projectId ${projectId}`);
    if (posts.length > 0) {
      console.log('[DEBUG] Post IDs:', posts.map(p => p.id));
    }
    // For each post, fetch images and tags (now with user details)
    for (const post of posts) {
      const imagesResult = await pool.query('SELECT file_path FROM post_images WHERE post_id = $1', [post.id]);
      post.images = imagesResult.rows.map(r => r.file_path);
      // Fetch tagged users (join with users table)
      const tagsResult = await pool.query(
        `SELECT u.id, u.name, u.email FROM post_tags pt JOIN users u ON pt.user_id = u.id WHERE pt.post_id = $1`,
        [post.id]
      );
      post.tags = tagsResult.rows; // Array of {id, name, email}
    }
    res.json({ posts });
  } catch (err) {
    console.error('[ERROR] Failed to fetch posts:', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// GET /api/posts/all - fetch all posts from all projects (admin only)
router.get('/all', adminAuth, async (req, res) => {
  try {
    const postsResult = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
    const posts = postsResult.rows;
    for (const post of posts) {
      const imagesResult = await pool.query('SELECT file_path FROM post_images WHERE post_id = $1', [post.id]);
      post.images = imagesResult.rows.map(r => r.file_path);
      const tagsResult = await pool.query(
        `SELECT u.id, u.name, u.email FROM post_tags pt JOIN users u ON pt.user_id = u.id WHERE pt.post_id = $1`,
        [post.id]
      );
      post.tags = tagsResult.rows;
    }
    res.json({ posts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch all posts' });
  }
});

// DELETE /api/posts/:postId - delete a post (admin only)
router.delete('/:postId', adminAuth, async (req, res) => {
  const { postId } = req.params;
  try {
    // Delete images and tags first due to FK constraints
    await pool.query('DELETE FROM post_images WHERE post_id = $1', [postId]);
    await pool.query('DELETE FROM post_tags WHERE post_id = $1', [postId]);
    await pool.query('DELETE FROM post_likes WHERE post_id = $1', [postId]);
    const result = await pool.query('DELETE FROM posts WHERE id = $1', [postId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete post' });
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

// DELETE /api/post_tags/:postId/:userId - remove a tag from a post (admin only)
router.delete('/post_tags/:postId/:userId', adminAuth, async (req, res) => {
  const { postId, userId } = req.params;
  try {
    const result = await pool.query('DELETE FROM post_tags WHERE post_id = $1 AND user_id = $2', [postId, userId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Tag not found for this post' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove tag from post' });
  }
});

// DELETE /api/post_images/:postId - remove an image from a post (admin only, expects {file_path} in body)
router.delete('/post_images/:postId', adminAuth, async (req, res) => {
  const { postId } = req.params;
  const { file_path } = req.body;
  if (!file_path) return res.status(400).json({ error: 'Missing file_path' });
  try {
    const result = await pool.query('DELETE FROM post_images WHERE post_id = $1 AND file_path = $2', [postId, file_path]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Image not found for this post' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove image from post' });
  }
});

export default router; 