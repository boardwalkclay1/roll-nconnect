const express = require("express");
const db = require("../db");
const router = express.Router();

// GET /api/reviews?spotId=...
router.get("/", async (req, res) => {
  const { spotId } = req.query;
  if (!spotId) return res.json([]);

  try {
    const result = await db.query(
      "SELECT * FROM reviews WHERE spot_id = $1 ORDER BY created_at DESC",
      [spotId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to load reviews" });
  }
});

// POST /api/reviews/add
router.post("/add", async (req, res) => {
  try {
    const { spotId, text, author } = req.body;
    const result = await db.query(
      `INSERT INTO reviews (spot_id, text, author)
       VALUES ($1,$2,$3)
       RETURNING *`,
      [spotId, text, author || "Skater"]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to add review" });
  }
});

module.exports = router;
