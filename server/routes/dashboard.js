// server/routes/dashboard.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/auth");

// Handicap chart for <20 rounds
const handicapTable = {
  1: { count: 0, adjustment: 0 },
  2: { count: 0, adjustment: 0 },
  3: { count: 1, adjustment: -2 },
  4: { count: 1, adjustment: -1 },
  5: { count: 1, adjustment: 0 },
  6: { count: 2, adjustment: -1 },
  7: { count: 2, adjustment: 0 },
  8: { count: 2, adjustment: 0 },
  9: { count: 3, adjustment: 0 },
  10: { count: 3, adjustment: 0 },
  11: { count: 3, adjustment: 0 },
  12: { count: 4, adjustment: 0 },
  13: { count: 4, adjustment: 0 },
  14: { count: 4, adjustment: 0 },
  15: { count: 5, adjustment: 0 },
  16: { count: 5, adjustment: 0 },
  17: { count: 6, adjustment: 0 },
  18: { count: 6, adjustment: 0 },
  19: { count: 7, adjustment: 0 },
};

// Handicap calculation
function calculateHandicap(rounds) {
  if (!rounds || rounds.length < 3) return null;

  const diffs = rounds.map((r) => {
    let holes = r.holes ?? 18;
    let scoreAdj = r.score;
    let ratingAdj = r.rating ?? 72;
    let slopeAdj = r.slope ?? 113;

    // Normalize 9-hole rounds for handicap math
    if (holes === 9) {
      scoreAdj *= 2;
      ratingAdj *= 2;
      holes = 18;
    }

    return ((scoreAdj - ratingAdj) * 113) / slopeAdj;
  });

  let handicap;
  if (rounds.length >= 20) {
    const recent20 = diffs.slice(-20);
    const lowest8 = [...recent20].sort((a, b) => a - b).slice(0, 8);
    handicap = lowest8.reduce((s, d) => s + d, 0) / lowest8.length;
  } else {
    const entry = handicapTable[rounds.length];
    const lowestN = [...diffs].sort((a, b) => a - b).slice(0, entry.count);
    handicap =
      lowestN.length > 0
        ? lowestN.reduce((s, d) => s + d, 0) / lowestN.length
        : 0;

    handicap += entry.adjustment;
  }

  return Math.min(Math.round(handicap * 10) / 10, 54.0);
}

// GET /api/dashboard
router.get("/", auth, async (req, res) => {
  const userId = req.user.id;

  const roundsQuery = `
    SELECT 
      r.*, 
      c.club_name, c.course_name,
      t.tee_name, t.par_total AS tee_par, t.course_rating, t.slope_rating, t.number_of_holes,
      l.city, l.state, l.address
    FROM rounds r
    LEFT JOIN courses c ON r.course_id = c.id
    LEFT JOIN tees t ON r.tee_id = t.id
    LEFT JOIN locations l ON c.id = l.course_id
    WHERE r.user_id = ?
    ORDER BY r.date ASC
  `;

  db.query(roundsQuery, [userId], (err, rounds) => {
    if (err) return res.status(500).json({ message: "Database error", details: err });

    const teeIds = rounds.map((r) => r.tee_id);

    // Fetch holes to compute FIR/GIR totals
    const holesQuery = `
      SELECT h.*, t.id AS tee_id
      FROM holes h
      JOIN tees t ON h.tee_id = t.id
      WHERE t.id IN (?)
    `;
    db.query(holesQuery, [teeIds], (err2, holes) => {
      if (err2)
        return res.status(500).json({ message: "Database error", details: err2 });

      // Group holes by tee
      const holesByTee = {};
      holes.forEach((h) => {
        if (!holesByTee[h.tee_id]) holesByTee[h.tee_id] = [];
        holesByTee[h.tee_id].push(h);
      });

      // Normalize rounds for frontend
      const all_rounds = rounds.map((r) => {
        const teeHoles = holesByTee[r.tee_id] ?? [];

        // FIR/GIR totals from holes
        const fir_total = teeHoles.filter((h) => h.par !== 3).length;
        const gir_total = teeHoles.length;

        return {
          id: r.id,
          date: r.date,
          holes: r.number_of_holes ?? gir_total ?? 18,
          score: r.score ?? 0,

          // Advanced stats simplified:
          // Only use if advanced_stats = true
          fir_hit: r.advanced_stats ? r.fir_hit : null,
          gir_hit: r.advanced_stats ? r.gir_hit : null,
          putts: r.advanced_stats ? r.putts : null,
          penalties: r.advanced_stats ? r.penalties : null,

          fir_total,
          gir_total,

          rating: r.course_rating ?? 72,
          slope: r.slope_rating ?? 113,
          par: r.tee_par ?? 72,
          advanced_stats: r.advanced_stats,

          course: {
            club_name: r.club_name ?? "-",
            course_name: r.course_name ?? "-",
            city: r.city ?? "-",
            state: r.state ?? "-",
            address: r.address ?? "-",
          },

          tee: {
            tee_id: r.tee_id,
            tee_name: r.tee_name ?? "-",
          },
        };
      });

      // Aggregate simple stats
      const total_rounds = all_rounds.length;
      const best_score = total_rounds
        ? Math.min(...all_rounds.map((r) => r.score))
        : null;
      const worst_score = total_rounds
        ? Math.max(...all_rounds.map((r) => r.score))
        : null;
      const average_score = total_rounds
        ? all_rounds.reduce((sum, r) => sum + r.score, 0) / total_rounds
        : null;

      // Aggregate advanced stats
      const adv = all_rounds.filter((r) => r.advanced_stats);

      const fir_sum = adv.reduce((s, r) => s + (r.fir_hit ?? 0), 0);
      const fir_total_sum = adv.reduce((s, r) => s + r.fir_total, 0);

      const gir_sum = adv.reduce((s, r) => s + (r.gir_hit ?? 0), 0);
      const gir_total_sum = adv.reduce((s, r) => s + r.gir_total, 0);

      const avg_putts =
        adv.length > 0
          ? adv.reduce((s, r) => s + (r.putts ?? 0), 0) / adv.length
          : null;

      const avg_penalties =
        adv.length > 0
          ? adv.reduce((s, r) => s + (r.penalties ?? 0), 0) / adv.length
          : null;

      const fir_avg = fir_total_sum
        ? (fir_sum / fir_total_sum) * 100
        : null;
      const gir_avg = gir_total_sum
        ? (gir_sum / gir_total_sum) * 100
        : null;

      const handicap = calculateHandicap(all_rounds);

      res.json({
        total_rounds,
        best_score,
        worst_score,
        average_score,
        avg_putts,
        avg_penalties,
        fir_avg,
        gir_avg,
        handicap,
        handicap_message:
          total_rounds < 3
            ? "Handicap is not calculated until at least 3 rounds are played."
            : null,
        all_rounds,
      });
    });
  });
});

module.exports = router;