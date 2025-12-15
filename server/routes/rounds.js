// routes/rounds.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const util = require("util");
const auth = require("../middleware/auth");

// Promisify query
const query = util.promisify(db.query).bind(db);

// ---------------------------------------------
// Helper: Recalculate round totals
// Only sums advanced stats if advanced_stats = 1
// ---------------------------------------------
async function recalcRoundTotals(roundId, advanced_stats) {
  const holes = await query(
    `SELECT score, fir_hit, gir_hit, putts, penalties FROM round_holes WHERE round_id = ?`,
    [roundId]
  );
  if (!holes.length) return;

  // Score: sum non-null
  const totalScore = holes.reduce((sum, h) => sum + (h.score ?? 0), 0);

  // Advanced stats: only sum if advanced_stats = 1
  const totals = { fir_hit: null, gir_hit: null, putts: null, penalties: null };

  if (advanced_stats) {
    const sumField = (field) => {
      const values = holes.map((h) => h[field]).filter((v) => v !== null && v !== undefined);
      return values.length ? values.reduce((a, b) => a + b, 0) : null;
    };

    totals.fir_hit = sumField("fir_hit");
    totals.gir_hit = sumField("gir_hit");
    totals.putts = sumField("putts");
    totals.penalties = sumField("penalties");
  }

  await query(
    `UPDATE rounds
     SET score = ?, fir_hit = ?, gir_hit = ?, putts = ?, penalties = ?, updated_date = ?
     WHERE id = ?`,
    [totalScore, totals.fir_hit, totals.gir_hit, totals.putts, totals.penalties, new Date(), roundId]
  );
}


// ---------------------------------------------
// Helper: Format DB row into API-friendly shape
// ensures nested objects: course, tee, location
// ---------------------------------------------
function formatRoundRow(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    course_id: row.course_id,
    tee_id: row.tee_id,
    hole_by_hole: row.hole_by_hole ? 1 : 0,
    advanced_stats: row.advanced_stats,
    date: row.date,
    score: row.score === null ? null : Number(row.score),
    fir_hit: row.fir_hit === null ? null : Number(row.fir_hit),
    gir_hit: row.gir_hit === null ? null : Number(row.gir_hit),
    putts: row.putts === null ? null : Number(row.putts),
    penalties: row.penalties === null ? null : Number(row.penalties),
    notes: row.notes,
    created_date: row.created_date,
    updated_date: row.updated_date,
    course: {
      id: row.course_id,
      course_name: row.course_name || null,
      club_name: row.club_name || null,
    },
    tee: {
      id: row.tee_id,
      tee_name: row.tee_name || null,
      gender: row.tee_gender || null,
      par_total: row.tee_par ?? null,
    },
    location: {
      city: row.city || "-",
      state: row.state || null,
      address: row.address || null,
    }
  };
}

// ---------------------------------------------
// GET all rounds
// ---------------------------------------------
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const rounds = await query(
      `SELECT 
         r.*, 
         c.course_name, c.club_name,
         t.tee_name, t.gender AS tee_gender, t.par_total AS tee_par,
         l.city, l.state, l.address
       FROM rounds r
       LEFT JOIN courses c ON r.course_id = c.id
       LEFT JOIN tees t ON r.tee_id = t.id
       LEFT JOIN locations l ON c.id = l.course_id
       WHERE r.user_id = ?
       ORDER BY r.date DESC`,
      [userId]
    );

    const formatted = rounds.map(formatRoundRow);
    res.json(formatted);
  } catch (err) {
    console.error("GET /api/rounds error:", err);
    res.status(500).json({ error: "Database error", details: err.message || err });
  }
});

// ---------------------------------------------
// GET single round (with holes if HBH)
// ---------------------------------------------
router.get("/:id", auth, async (req, res) => {
  try {
    const roundId = Number(req.params.id);
    if (Number.isNaN(roundId)) return res.status(400).json({ error: "Invalid round id" });

    const userId = req.user.id;

    const rows = await query(
      `SELECT 
         r.*, 
         c.course_name, c.club_name,
         t.tee_name, t.gender AS tee_gender, t.par_total AS tee_par,
         l.city, l.state, l.address
       FROM rounds r
       LEFT JOIN courses c ON r.course_id = c.id
       LEFT JOIN tees t ON r.tee_id = t.id
       LEFT JOIN locations l ON c.id = l.course_id
       WHERE r.id = ? AND r.user_id = ?`,
      [roundId, userId]
    );

    if (!rows.length) return res.status(404).json({ error: "Round not found" });

    const round = formatRoundRow(rows[0]);

    if (round.hole_by_hole) {
      const holes = await query(
        `SELECT hole_id, score, fir_hit, gir_hit, putts, penalties 
         FROM round_holes 
         WHERE round_id = ? 
         ORDER BY hole_id ASC`,
        [roundId]
      );

      round.round_holes = holes.map(h => ({
        hole_id: h.hole_id,
        score: h.score === null ? null : Number(h.score),
        fir_hit: h.fir_hit === null ? null : Number(h.fir_hit),
        gir_hit: h.gir_hit === null ? null : Number(h.gir_hit),
        putts: h.putts === null ? null : Number(h.putts),
        penalties: h.penalties === null ? null : Number(h.penalties),
      }));
    } else {
      round.round_holes = [];
    }

    res.json(round);
  } catch (err) {
    console.error("GET /api/rounds/:id error:", err);
    res.status(500).json({ error: "Database error", details: err.message || err });
  }
});

// ---------------------------------------------
// CREATE Round
// ---------------------------------------------
router.post("/", auth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const {
      course_id,
      tee_id,
      date,
      score,
      fir_hit,
      gir_hit,
      putts,
      penalties,
      notes,
      hole_by_hole,
      advanced_stats,
      round_holes
    } = req.body;

    if (!course_id || !tee_id || !date) return res.status(400).json({ error: "course_id, tee_id, and date are required" });

    const created_date = new Date();

    const insertScore = hole_by_hole ? 0 : score ?? null;
    const insertFir = (!hole_by_hole && advanced_stats) ? fir_hit ?? null : null;
    const insertGir = (!hole_by_hole && advanced_stats) ? gir_hit ?? null : null;
    const insertPutts = (!hole_by_hole && advanced_stats) ? putts ?? null : null;
    const insertPenalties = (!hole_by_hole && advanced_stats) ? penalties ?? null : null;

    await query("START TRANSACTION");

    const result = await query(
      `INSERT INTO rounds
       (user_id, course_id, tee_id, hole_by_hole, advanced_stats, date, score, fir_hit, gir_hit, putts, penalties, notes, created_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, course_id, tee_id, hole_by_hole ? 1 : 0, advanced_stats ? 1 : 0, date, insertScore, insertFir, insertGir, insertPutts, insertPenalties, notes ?? null, created_date]
    );

    const roundId = result.insertId;

    if (hole_by_hole && Array.isArray(round_holes) && round_holes.length) {
      const values = round_holes.map(h => [
        roundId,
        h.hole_id,
        h.score ?? 0,
        advanced_stats ? h.fir_hit ?? null : null,
        advanced_stats ? h.gir_hit ?? null : null,
        advanced_stats ? h.putts ?? null : null,
        advanced_stats ? h.penalties ?? null : null,
        created_date
      ]);
      await query(`INSERT INTO round_holes (round_id, hole_id, score, fir_hit, gir_hit, putts, penalties, created_date) VALUES ?`, [values]);
      await recalcRoundTotals(roundId, advanced_stats);
    }

    await query("COMMIT");
    res.status(201).json({ message: "Round created", roundId });
  } catch (err) {
    console.error("POST /api/rounds error:", err);
    try { await query("ROLLBACK"); } catch (e) { console.error("Rollback error:", e); }
    res.status(500).json({ error: "Database error", details: err.message || err });
  }
});

// ---------------------------------------------
// UPDATE Round
// ---------------------------------------------
router.put("/:id", auth, async (req, res) => {
  try {
    const roundId = req.params.id;
    const user_id = req.user.id;
    const {
      course_id,
      tee_id,
      date,
      score,
      fir_hit,
      gir_hit,
      putts,
      penalties,
      notes,
      hole_by_hole,
      advanced_stats,
      round_holes
    } = req.body;

    const updated_date = new Date();

    const updateScore = hole_by_hole ? 0 : score ?? null;
    const updateFir = (!hole_by_hole && advanced_stats) ? fir_hit ?? null : null;
    const updateGir = (!hole_by_hole && advanced_stats) ? gir_hit ?? null : null;
    const updatePutts = (!hole_by_hole && advanced_stats) ? putts ?? null : null;
    const updatePenalties = (!hole_by_hole && advanced_stats) ? penalties ?? null : null;

    await query("START TRANSACTION");

    const result = await query(
      `UPDATE rounds
       SET course_id = ?, tee_id = ?, date = ?, hole_by_hole = ?, advanced_stats = ?, score = ?, fir_hit = ?, gir_hit = ?, putts = ?, penalties = ?, notes = ?, updated_date = ?
       WHERE id = ? AND user_id = ?`,
      [course_id, tee_id, date, hole_by_hole ? 1 : 0, advanced_stats ? 1 : 0, updateScore, updateFir, updateGir, updatePutts, updatePenalties, notes ?? null, updated_date, roundId, user_id]
    );

    if (result.affectedRows === 0) {
      await query("ROLLBACK");
      return res.status(404).json({ error: "Round not found or not authorized" });
    }

    if (hole_by_hole && Array.isArray(round_holes)) {
      await query(`DELETE FROM round_holes WHERE round_id = ?`, [roundId]);

      if (round_holes.length) {
        const values = round_holes.map(h => [
          roundId, h.hole_id, h.score ?? 0,
          advanced_stats ? h.fir_hit ?? null : null,
          advanced_stats ? h.gir_hit ?? null : null,
          advanced_stats ? h.putts ?? null : null,
          advanced_stats ? h.penalties ?? null : null,
          updated_date
        ]);
        await query(`INSERT INTO round_holes (round_id, hole_id, score, fir_hit, gir_hit, putts, penalties, created_date) VALUES ?`, [values]);
      }

      await recalcRoundTotals(roundId, advanced_stats);
    }

    await query("COMMIT");
    res.json({ message: "Round updated" });
  } catch (err) {
    console.error("PUT /api/rounds/:id error:", err);
    try { await query("ROLLBACK"); } catch (e) { console.error("Rollback error:", e); }
    res.status(500).json({ error: "Database error", details: err.message || err });
  }
});

// ---------------------------------------------
// DELETE Round
// ---------------------------------------------
router.delete("/:id", auth, async (req, res) => {
  try {
    const roundId = req.params.id;
    const userId = req.user.id;

    await query("START TRANSACTION");
    await query(`DELETE FROM round_holes WHERE round_id = ?`, [roundId]);
    const result = await query(`DELETE FROM rounds WHERE id = ? AND user_id = ?`, [roundId, userId]);

    if (result.affectedRows === 0) {
      await query("ROLLBACK");
      return res.status(404).json({ error: "Round not found or not authorized" });
    }

    await query("COMMIT");
    res.json({ message: "Round deleted" });
  } catch (err) {
    console.error("DELETE /api/rounds/:id error:", err);
    try { await query("ROLLBACK"); } catch (e) { console.error("Rollback error:", e); }
    res.status(500).json({ error: "Database error", details: err.message || err });
  }
});

module.exports = router;