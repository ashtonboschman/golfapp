const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// GET all courses
router.get('/', auth, (req, res) => {
  const sql = "SELECT * FROM courses";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// GET one course by ID
router.get('/:id', auth, (req, res) => {
  const courseId = req.params.id;
  const sql = "SELECT * FROM courses WHERE id = ?";
  db.query(sql, [courseId], (err, results) => {
    if (err) return res.status(500).json(err);
    if (results.length === 0) return res.status(404).json({ error: "Course not found" });
    res.json(results[0]);
  });
});

// POST create new course
router.post('/', auth, (req, res) => {
  const {
    name, city, holes, par, slope, rating, FIR_possible
  } = req.body;

  if (!name || !holes) return res.status(400).json({ error: "Name and holes required" });

  const created_by = req.user.id;
  const created_date = new Date();

  const sql = `
    INSERT INTO courses 
    (name, city, holes, par, slope, rating, FIR_possible, created_by, created_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(sql, [name, city || null, holes, par || null, slope || null, rating || null, FIR_possible || null, created_by, created_date], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "✅ Course created!", courseId: result.insertId });
  });
});

// PUT update course
router.put('/:id', auth, (req, res) => {
  const courseId = req.params.id;
  const {
    name, city, holes, par, slope, rating, FIR_possible
  } = req.body;

  const updated_by = req.user.id;
  const updated_date = new Date();

  const updates = [];
  const values = [];

  if (name) { updates.push("name = ?"); values.push(name); }
  if (city !== undefined) { updates.push("city = ?"); values.push(city); }
  if (holes !== undefined) { updates.push("holes = ?"); values.push(holes); }
  if (par !== undefined) { updates.push("par = ?"); values.push(par); }
  if (slope !== undefined) { updates.push("slope = ?"); values.push(slope); }
  if (rating !== undefined) { updates.push("rating = ?"); values.push(rating); }
  if (FIR_possible !== undefined) { updates.push("FIR_possible = ?"); values.push(FIR_possible); }

  updates.push("updated_by = ?", "updated_date = ?");
  values.push(updated_by, updated_date);

  values.push(courseId);

  const sql = `UPDATE courses SET ${updates.join(", ")} WHERE id = ?`;
  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Course not found" });
    res.json({ message: "✅ Course updated!" });
  });
});

// DELETE course
router.delete('/:id', auth, (req, res) => {
  const courseId = req.params.id;
  const sql = "DELETE FROM courses WHERE id = ?";
  db.query(sql, [courseId], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Course not found" });
    res.json({ message: "✅ Course deleted!" });
  });
});

module.exports = router;