const express = require("express");
const db = require("../db");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM trails ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to load trails" });
  }
});

router.post("/add", async (req, res) => {
  try {
    const { name, points } = req.body;
    const result = await db.query(
      "INSERT INTO trails (name, points) VALUES ($1,$2) RETURNING *",
      [name, JSON.stringify(points)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to add trail" });
  }
});

module.exports = router;
