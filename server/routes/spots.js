const express = require("express");
const db = require("../db");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM spots ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to load spots" });
  }
});

router.post("/add", async (req, res) => {
  try {
    const { name, category, description, lat, lng, city } = req.body;
    const result = await db.query(
      "INSERT INTO spots (name, category, description, lat, lng, city) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [name, category, description, lat, lng, city]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to add spot" });
  }
});

module.exports = router;
