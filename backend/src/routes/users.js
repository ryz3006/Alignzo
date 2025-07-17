import express from "express";
const router = express.Router();

// Example: Get current user (to be protected by auth middleware)
router.get("/me", (req, res) => {
  res.json({ user: "placeholder" });
});

export default router; 