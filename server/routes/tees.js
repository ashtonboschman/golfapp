const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/auth");

// Helper to promisify queries
const query = (sql, params) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, results) => (err ? reject(err) : resolve(results)))
  );

// -----------------------------------------------------------------------------
// Helper: attach holes to tees
// -----------------------------------------------------------------------------
const attachHoles = async (tees) => {
  const teeIds = tees.map(t => t.id);
  const holes = teeIds.length
    ? await query(`SELECT * FROM holes WHERE tee_id IN (?) ORDER BY tee_id ASC, hole_number ASC`, [teeIds])
    : [];
  return tees.map(t => ({ ...t, holes: holes.filter(h => h.tee_id === t.id) }));
};

// ============================================================================
// GET all tees (optional ?course_id=) with holes
// ============================================================================
router.get("/", auth, async (req, res) => {
  try {
    const { course_id } = req.query;
    const teesSql = course_id
      ? "SELECT * FROM tees WHERE course_id = ? ORDER BY course_id ASC, id ASC"
      : "SELECT * FROM tees ORDER BY course_id ASC, id ASC";

    const tees = await query(teesSql, course_id ? [course_id] : []);
    if (!tees.length) return res.json({ type: "success", tees: [] });

    const teesWithHoles = await attachHoles(tees);
    res.json({ type: "success", tees: teesWithHoles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: "error", message: "Database error", details: err });
  }
});

// ============================================================================
// GET single tee by ID with holes
// ============================================================================
router.get("/:id", auth, async (req, res) => {
  try {
    const teeId = req.params.id;
    const tees = await query(`SELECT * FROM tees WHERE id = ?`, [teeId]);
    if (!tees.length) return res.status(404).json({ type: "error", message: "Tee not found" });

    const teesWithHoles = await attachHoles(tees);
    res.json({ type: "success", tee: teesWithHoles[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: "error", message: "Database error", details: err });
  }
});

// ============================================================================
// GET holes for a specific tee
// ============================================================================
router.get("/:id/holes", auth, async (req, res) => {
  try {
    const teeId = req.params.id;
    const holes = await query(
      `SELECT * FROM holes WHERE tee_id = ? ORDER BY hole_number ASC`,
      [teeId]
    );
    res.json({ type: "success", holes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: "error", message: "Database error", details: err });
  }
});

// ============================================================================
// CREATE tee
// ============================================================================
router.post("/", auth, async (req, res) => {
  try {
    const body = req.body;
    const required = ["course_id", "gender", "tee_name"];
    for (const field of required)
      if (!body[field]) return res.status(400).json({ type: "error", message: `${field} is required` });

    const sql = `
      INSERT INTO tees (
        course_id, gender, tee_name,
        course_rating, slope_rating, bogey_rating,
        total_yards, total_meters, number_of_holes, par_total,
        front_course_rating, front_slope_rating, front_bogey_rating,
        back_course_rating, back_slope_rating, back_bogey_rating
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      body.course_id,
      body.gender,
      body.tee_name,
      body.course_rating ?? null,
      body.slope_rating ?? null,
      body.bogey_rating ?? null,
      body.total_yards ?? null,
      body.total_meters ?? null,
      body.number_of_holes ?? null,
      body.par_total ?? null,
      body.front_course_rating ?? null,
      body.front_slope_rating ?? null,
      body.front_bogey_rating ?? null,
      body.back_course_rating ?? null,
      body.back_slope_rating ?? null,
      body.back_bogey_rating ?? null
    ];

    const result = await query(sql, values);
    const newTee = await query(`SELECT * FROM tees WHERE id = ?`, [result.insertId]);
    const teeWithHoles = await attachHoles(newTee);

    res.json({ type: "success", message: "Tee created", tee: teeWithHoles[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: "error", message: "Database error", details: err });
  }
});

// ============================================================================
// UPDATE tee
// ============================================================================
router.put("/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;
    const allowed = [
      "course_id", "gender", "tee_name",
      "course_rating", "slope_rating", "bogey_rating",
      "total_yards", "total_meters", "number_of_holes", "par_total",
      "front_course_rating", "front_slope_rating", "front_bogey_rating",
      "back_course_rating", "back_slope_rating", "back_bogey_rating"
    ];

    const updates = [];
    const values = [];
    for (const [key, value] of Object.entries(req.body)) {
      if (allowed.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (!updates.length) return res.status(400).json({ type: "error", message: "No valid fields provided" });

    values.push(id);
    await query(`UPDATE tees SET ${updates.join(", ")}, updated_date = NOW() WHERE id = ?`, values);

    const updatedTee = await query(`SELECT * FROM tees WHERE id = ?`, [id]);
    const teeWithHoles = await attachHoles(updatedTee);

    res.json({ type: "success", message: "Tee updated", tee: teeWithHoles[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: "error", message: "Database error", details: err });
  }
});

// ============================================================================
// DELETE tee (also deletes holes)
// ============================================================================
router.delete("/:id", auth, async (req, res) => {
  try {
    const teeId = req.params.id;
    await query(`DELETE FROM holes WHERE tee_id = ?`, [teeId]);
    const result = await query(`DELETE FROM tees WHERE id = ?`, [teeId]);
    if (result.affectedRows === 0) return res.status(404).json({ type: "error", message: "Tee not found" });

    res.json({ type: "success", message: "Tee deleted", id: teeId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: "error", message: "Database error", details: err });
  }
});

module.exports = router;