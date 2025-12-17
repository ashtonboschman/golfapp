const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/auth");

// Helper to promisify queries
const query = (sql, params) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, results) => (err ? reject(err) : resolve(results)))
  );

// ============================================================================
// GET single hole by ID
// ============================================================================
router.get("/:id", auth, async (req, res) => {
  try {
    const holeId = req.params.id;
    const results = await query(`SELECT * FROM holes WHERE id = ?`, [holeId]);
    if (!results.length) 
      return res.status(404).json({ type: "error", message: "Hole not found" });

    const h = results[0];
    res.json({
      type: "success",
      hole: {
        id: h.id,
        tee_id: h.tee_id,
        hole_number: h.hole_number,
        par: h.par,
        yardage: h.yardage,
        handicap: h.handicap
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: "error", message: "Database error", details: err });
  }
});

// ============================================================================
// CREATE hole under a specific tee
// ============================================================================
router.post("/tees/:tee_id/holes", auth, async (req, res) => {
  try {
    const teeId = req.params.tee_id;
    const { hole_number, par, yardage, handicap } = req.body;
    if (hole_number === undefined) 
      return res.status(400).json({ type: "error", message: "hole_number is required" });

    const result = await query(
      `INSERT INTO holes (tee_id, hole_number, par, yardage, handicap) VALUES (?, ?, ?, ?, ?)`,
      [teeId, hole_number, par ?? null, yardage ?? null, handicap ?? null]
    );

    const newHole = await query(`SELECT * FROM holes WHERE id = ?`, [result.insertId]);
    const h = newHole[0];

    res.status(201).json({
      type: "success",
      message: "Hole created",
      hole: {
        id: h.id,
        tee_id: h.tee_id,
        hole_number: h.hole_number,
        par: h.par,
        yardage: h.yardage,
        handicap: h.handicap
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: "error", message: "Database error", details: err });
  }
});

// ============================================================================
// UPDATE hole
// ============================================================================
router.put("/:id", auth, async (req, res) => {
  try {
    const holeId = req.params.id;
    const allowedFields = ["hole_number", "par", "yardage", "handicap"];
    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(req.body)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (!updates.length) 
      return res.status(400).json({ type: "error", message: "No valid fields provided" });

    values.push(holeId);
    await query(`UPDATE holes SET ${updates.join(", ")} WHERE id = ?`, values);

    const updatedHole = await query(`SELECT * FROM holes WHERE id = ?`, [holeId]);
    const h = updatedHole[0];

    res.json({
      type: "success",
      message: "Hole updated",
      hole: {
        id: h.id,
        tee_id: h.tee_id,
        hole_number: h.hole_number,
        par: h.par,
        yardage: h.yardage,
        handicap: h.handicap
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: "error", message: "Database error", details: err });
  }
});

// ============================================================================
// DELETE hole
// ============================================================================
router.delete("/:id", auth, async (req, res) => {
  try {
    const holeId = req.params.id;
    const result = await query(`DELETE FROM holes WHERE id = ?`, [holeId]);
    if (result.affectedRows === 0) 
      return res.status(404).json({ type: "error", message: "Hole not found" });

    res.json({ type: "success", message: "Hole deleted", holeId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: "error", message: "Database error", details: err });
  }
});

module.exports = router;