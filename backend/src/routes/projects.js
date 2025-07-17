import express from "express";
const router = express.Router();

// Example: Get all projects (to be protected by auth middleware)
router.get("/", (req, res) => {
  res.json({ projects: [] });
});

export default router; 