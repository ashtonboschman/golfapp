const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// GET all rounds for logged-in user
router.get('/', auth, (req, res) => {
  const user_id = req.user.id;

  const sql = `
    SELECT r.*, c.name AS course_name, c.city, c.holes AS course_holes, c.par_total
    FROM rounds r
    JOIN courses c ON r.course_id = c.id
    WHERE r.user_id = ?
    ORDER BY r.date DESC
  `;
  db.query(sql, [user_id], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// POST create new round
router.post('/', auth, (req, res) => {
  const user_id = req.user.id;
  const { course_id, date, score, notes } = req.body;

  if (!course_id || !score || !date) return res.status(400).json({ error: "course_id, score, and date required" });

  const sql = `
    INSERT INTO rounds (user_id, course_id, date, score, notes)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(sql, [user_id, course_id, date, score, notes || null], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "✅ Round logged!", roundId: result.insertId });
  });
});

module.exports = router;