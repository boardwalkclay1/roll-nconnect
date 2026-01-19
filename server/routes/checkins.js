const express = require("express");
const db = require("../db");
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { lat, lng, userId } = req.body;
    await db.query(
      "INSERT INTO checkins (user_id, lat, lng) VALUES ($1,$2,$3)",
      [userId || null, lat, lng]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to check in" });
  }
});

module.exports = router;
