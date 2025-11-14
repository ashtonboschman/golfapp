const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// GET all rounds for logged-in user
router.get('/', auth, (req, res) => {
  const user_id = req.user.id;
  const sql = `
    SELECT r.*, c.name AS course_name, c.city, c.holes AS course_holes, c.par AS course_par, c.slope, c.rating
    FROM rounds r
    JOIN courses c ON r.course_id = c.id
    WHERE r.user_id = ?
    ORDER BY r.date DESC
  `;
  db.query(sql, [user_id], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error", details: err });
    res.json(results);
  });
});

// GET single round by ID
router.get('/:id', auth, (req, res) => {
  const roundId = req.params.id;
  const user_id = req.user.id;
  const sql = `
    SELECT r.*, c.name AS course_name, c.city, c.holes AS course_holes, c.par AS course_par
    FROM rounds r
    JOIN courses c ON r.course_id = c.id
    WHERE r.user_id = ? AND r.id = ?
  `;
  db.query(sql, [user_id, roundId], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error", details: err });
    if (results.length === 0) return res.status(404).json({ error: "Round not found" });
    res.json(results[0]);
  });
});

// POST create new round
router.post('/', auth, (req, res) => {
  const user_id = req.user.id;
  const { course_id, date, score, FIR_hit, GIR_hit, putts, penalties, notes } = req.body;

  // Basic validation
  if (!course_id || !score || !date) {
    return res.status(400).json({ error: "course_id, score, and date are required" });
  }

  const created_date = new Date();
  const sql = `
    INSERT INTO rounds
    (user_id, course_id, date, score, FIR_hit, GIR_hit, putts, penalties, notes, created_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [user_id, course_id, date, score, FIR_hit || null, GIR_hit || null, putts || null, penalties || null, notes || null, created_date];

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: "Database error", details: err });
    res.json({ message: "✅ Round logged!", roundId: result.insertId });
  });
});

// PUT update a round
router.put('/:id', auth, (req, res) => {
  const roundId = req.params.id;
  const user_id = req.user.id;
  const { course_id, date, score, FIR_hit, GIR_hit, putts, penalties, notes } = req.body;

  const updates = [];
  const values = [];

  if (course_id !== undefined) { updates.push("course_id = ?"); values.push(course_id); }
  if (date !== undefined) { updates.push("date = ?"); values.push(date); }
  if (score !== undefined) { updates.push("score = ?"); values.push(score); }
  if (FIR_hit !== undefined) { updates.push("FIR_hit = ?"); values.push(FIR_hit); }
  if (GIR_hit !== undefined) { updates.push("GIR_hit = ?"); values.push(GIR_hit); }
  if (putts !== undefined) { updates.push("putts = ?"); values.push(putts); }
  if (penalties !== undefined) { updates.push("penalties = ?"); values.push(penalties); }
  if (notes !== undefined) { updates.push("notes = ?"); values.push(notes); }

  if (updates.length === 0) return res.status(400).json({ error: "No fields provided for update" });

  updates.push("updated_date = ?");
  values.push(new Date());

  values.push(user_id, roundId);

  const sql = `UPDATE rounds SET ${updates.join(", ")} WHERE user_id = ? AND id = ?`;
  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: "Database error", details: err });
    if (result.affectedRows === 0) return res.status(404).json({ error: "Round not found" });
    res.json({ message: "✅ Round updated!" });
  });
});

// DELETE a round
router.delete('/:id', auth, (req, res) => {
  const roundId = req.params.id;
  const user_id = req.user.id;

  const sql = "DELETE FROM rounds WHERE user_id = ? AND id = ?";
  db.query(sql, [user_id, roundId], (err, result) => {
    if (err) return res.status(500).json({ error: "Database error", details: err });
    if (result.affectedRows === 0) return res.status(404).json({ error: "Round not found" });
    res.json({ message: "✅ Round deleted!" });
  });
});

module.exports = router;