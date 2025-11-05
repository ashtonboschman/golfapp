const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// GET all courses
router.get('/', auth, (req, res) => {
  db.query("SELECT * FROM courses", (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// GET one course by ID
router.get('/:id', auth, (req, res) => {
  const courseId = req.params.id;
  db.query("SELECT * FROM courses WHERE id = ?", [courseId], (err, results) => {
    if (err) return res.status(500).json(err);
    if (results.length === 0) return res.status(404).json({ error: "Course not found" });
    res.json(results[0]);
  });
});

// POST create new course
router.post('/', auth, (req, res) => {
  const { name, city, holes, par_total } = req.body;

  if (!name || !holes) return res.status(400).json({ error: "Name and holes required" });

  const sql = "INSERT INTO courses (name, city, holes, par_total) VALUES (?, ?, ?, ?)";
  db.query(sql, [name, city || null, holes, par_total || null], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "✅ Course created!", courseId: result.insertId });
  });
});

module.exports = router;