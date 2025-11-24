const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

/* ----------------------------
   GET all tees (sorted by id)
----------------------------- */
router.get('/', auth, (req, res) => {
  const sql = `
    SELECT id, name
    FROM tees
    ORDER BY id ASC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

/* ----------------------------
   GET one tee by id
----------------------------- */
router.get('/:id', auth, (req, res) => {
  const teeId = req.params.id;
  const sql = `SELECT id, name FROM tees WHERE id = ?`;
  db.query(sql, [teeId], (err, results) => {
    if (err) return res.status(500).json(err);
    if (results.length === 0)
      return res.status(404).json({ error: "Tee not found" });
    res.json(results[0]);
  });
});

module.exports = router;
