const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/auth");

const query = (sql, params) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, results) => (err ? reject(err) : resolve(results)))
  );

// ============================================================================
// Utility: Recalculate totals for a hole-by-hole round
// ============================================================================
const recalcRoundTotals = async (roundId) => {
  const totals = await query(
    `
    SELECT score,
           fir_hit,
           gir_hit,
           putts,
           penalties
    FROM round_holes
    WHERE round_id = ?
  `,
    [roundId]
  );

  if (totals.length) {
    const holes = totals;
    const sumField = (field) => {
      const values = holes.map((h) => h[field]).filter((v) => v !== null && v !== undefined);
      return values.length ? values.reduce((a, b) => a + b, 0) : null;
    };

    await query(
      `
      UPDATE rounds
      SET score = ?, fir_hit = ?, gir_hit = ?, putts = ?, penalties = ?, updated_date = ?
      WHERE id = ?
    `,
      [
        holes.reduce((sum, h) => sum + (h.score ?? 0), 0), // score always sums 0 if null
        sumField("fir_hit"),
        sumField("gir_hit"),
        sumField("putts"),
        sumField("penalties"),
        new Date(),
        roundId,
      ]
    );
  }
};

// ============================================================================
// GET all round_holes for a specific round
// ============================================================================
router.get("/rounds/:round_id/holes", auth, async (req, res) => {
  try {
    const roundId = req.params.round_id;

    const results = await query(
      `SELECT * FROM round_holes WHERE round_id = ? ORDER BY hole_id ASC`,
      [roundId]
    );

    res.json({
      round_id: parseInt(roundId),
      round_holes: results.map((rh) => ({
        id: rh.id,
        round_id: rh.round_id,
        hole_id: rh.hole_id,
        score: rh.score,
        fir_hit: rh.fir_hit,
        gir_hit: rh.gir_hit,
        putts: rh.putts,
        penalties: rh.penalties,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error", details: err });
  }
});

// ============================================================================
// GET single round_hole entry by ID
// ============================================================================
router.get("/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;
    const results = await query(`SELECT * FROM round_holes WHERE id = ?`, [id]);

    if (!results.length)
      return res.status(404).json({ error: "Round hole entry not found" });

    const rh = results[0];
    res.json({
      id: rh.id,
      round_id: rh.round_id,
      hole_id: rh.hole_id,
      score: rh.score,
      fir_hit: rh.fir_hit,
      gir_hit: rh.gir_hit,
      putts: rh.putts,
      penalties: rh.penalties,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error", details: err });
  }
});

// ============================================================================
// CREATE round_hole entry
// ============================================================================
router.post("/rounds/:round_id/holes", auth, async (req, res) => {
  try {
    const roundId = req.params.round_id;
    const { hole_id, score, fir_hit, gir_hit, putts, penalties } = req.body;

    if (!hole_id) return res.status(400).json({ error: "hole_id is required" });

    const result = await query(
      `INSERT INTO round_holes (round_id, hole_id, score, fir_hit, gir_hit, putts, penalties)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [roundId, hole_id, score ?? null, fir_hit ?? null, gir_hit ?? null, putts ?? null, penalties ?? null]
    );

    const newEntry = await query(`SELECT * FROM round_holes WHERE id = ?`, [result.insertId]);
    const rh = newEntry[0];

    // Recalculate totals for the round
    await recalcRoundTotals(roundId);

    res.json({
      message: "Round hole entry created",
      round_hole: {
        id: rh.id,
        round_id: rh.round_id,
        hole_id: rh.hole_id,
        score: rh.score,
        fir_hit: rh.fir_hit,
        gir_hit: rh.gir_hit,
        putts: rh.putts,
        penalties: rh.penalties,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error", details: err });
  }
});

// ============================================================================
// UPDATE a round_hole entry
// ============================================================================
router.put("/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;
    const allowedFields = ["hole_id", "score", "fir_hit", "gir_hit", "putts", "penalties"];

    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(req.body)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (!updates.length) return res.status(400).json({ error: "No valid fields provided" });

    values.push(id);

    await query(`UPDATE round_holes SET ${updates.join(", ")} WHERE id = ?`, values);

    const updated = await query(`SELECT * FROM round_holes WHERE id = ?`, [id]);
    const rh = updated[0];

    // Recalculate totals for the round
    await recalcRoundTotals(rh.round_id);

    res.json({
      message: "Round hole entry updated",
      round_hole: {
        id: rh.id,
        round_id: rh.round_id,
        hole_id: rh.hole_id,
        score: rh.score,
        fir_hit: rh.fir_hit,
        gir_hit: rh.gir_hit,
        putts: rh.putts,
        penalties: rh.penalties,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error", details: err });
  }
});

// ============================================================================
// DELETE round_hole entry
// ============================================================================
router.delete("/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;

    // Fetch the round_id before deleting
    const results = await query(`SELECT round_id FROM round_holes WHERE id = ?`, [id]);
    if (!results.length) return res.status(404).json({ error: "Round hole entry not found" });
    const roundId = results[0].round_id;

    await query(`DELETE FROM round_holes WHERE id = ?`, [id]);

    // Recalculate totals for the round
    await recalcRoundTotals(roundId);

    res.json({ message: "Round hole entry deleted", id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error", details: err });
  }
});

module.exports = router;