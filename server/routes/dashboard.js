// server/routes/dashboard.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/auth");

// Handicaps for <20 rounds
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

// Corrected Handicap calculation
function calculateHandicap(rounds) {
  if (!rounds || rounds.length < 3) return null;

  const diffs = rounds.map((r) => {
    let holes = r.holes ?? 18;
    let scoreAdj = r.score;
    let ratingAdj = r.rating;

    // Scale 9-hole rounds to 18-hole equivalent
    if (holes === 9) {
      scoreAdj = r.score * 2;
      ratingAdj = r.rating * 2;
      holes = 18;
    }

    return ((scoreAdj - ratingAdj) * 113) / r.slope;
  });

  let handicap;
  if (rounds.length >= 20) {
    const recent20 = diffs.slice(-20);
    const lowest8 = [...recent20].sort((a, b) => a - b).slice(0, 8);
    handicap = lowest8.reduce((sum, d) => sum + d, 0) / lowest8.length;
  } else {
    const tableEntry = handicapTable[rounds.length];
    const lowestN = [...diffs].sort((a, b) => a - b).slice(0, tableEntry.count);
    handicap = lowestN.length > 0 ? lowestN.reduce((sum, d) => sum + d, 0) / lowestN.length : 0;
    handicap += tableEntry.adjustment;
  }

  // Cap at 54 and round to nearest tenth
  return Math.min(Math.round(handicap * 10) / 10, 54.0);
}

// GET /api/dashboard
router.get("/", auth, async (req, res) => {
  const userId = req.user.id;

  try {
    // Fetch rounds with course info
    const roundsQuery = `
      SELECT r.id, r.date, r.score, r.FIR_hit, r.GIR_hit, r.putts, r.penalties,
             c.FIR_possible AS FIR_total, c.holes AS holes,
             c.rating, c.slope, c.par
      FROM rounds r
      JOIN courses c ON r.course_id = c.id
      WHERE r.user_id = ?
      ORDER BY r.date DESC
      LIMIT 20
    `;
    const roundsResult = await new Promise((resolve, reject) => {
      db.query(roundsQuery, [userId], (err, result) => (err ? reject(err) : resolve(result)));
    });

    // Compute last 5 rounds with null safety
    const last5Rounds = roundsResult.slice(0, 5).map(r => ({
      ...r,
      FIR_hit: r.FIR_hit ?? null,
      FIR_total: r.FIR_total ?? null,
      FIR_pct: r.FIR_total && r.FIR_hit !== null ? (r.FIR_hit / r.FIR_total) * 100 : null,
      GIR_hit: r.GIR_hit ?? null,
      GIR_total: r.holes ?? 18,
      GIR_pct: r.GIR_total && r.GIR_hit !== null ? (r.GIR_hit / r.GIR_total) * 100 : null,
      putts: r.putts ?? null,
      penalties: r.penalties ?? null,
      holes: r.holes ?? 18,
    }));

    // Overall stats
    const overallStatsQuery = `
      SELECT 
        COUNT(*) AS total_rounds,
        MIN(score) AS best_score,
        MAX(score) AS worst_score,
        AVG(score) AS average_score,
        SUM(FIR_hit) AS FIR_hit_sum,
        SUM(CASE WHEN FIR_hit IS NOT NULL THEN FIR_possible ELSE 0 END) AS FIR_total_sum,
        SUM(GIR_hit) AS GIR_hit_sum,
        SUM(CASE WHEN GIR_hit IS NOT NULL THEN c.holes ELSE 0 END) AS GIR_total_sum,
        AVG(putts) AS avg_putts,
        AVG(penalties) AS avg_penalties
      FROM rounds r
      JOIN courses c ON r.course_id = c.id
      WHERE r.user_id = ?
    `;
    const overallResult = await new Promise((resolve, reject) => {
      db.query(overallStatsQuery, [userId], (err, result) => (err ? reject(err) : resolve(result)));
    });
    const overall = overallResult[0];

    const FIR_avg = overall.FIR_total_sum ? (overall.FIR_hit_sum / overall.FIR_total_sum) * 100 : null;
    const GIR_avg = overall.GIR_total_sum ? (overall.GIR_hit_sum / overall.GIR_total_sum) * 100 : null;

    const handicap = calculateHandicap(roundsResult);
    const handicap_message = roundsResult.length < 3 ? "Handicap is not calculated until at least 3 rounds are played." : null;

    res.json({
      total_rounds: overall.total_rounds ?? 0,
      best_score: overall.best_score ?? null,
      worst_score: overall.worst_score ?? null,
      average_score: overall.average_score ?? null,
      avg_putts: overall.avg_putts ?? null,
      avg_penalties: overall.avg_penalties ?? null,
      last_5_rounds: last5Rounds,
      FIR_avg,
      GIR_avg,
      handicap,
      handicap_message,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ message: "Server error", details: err });
  }
});

module.exports = router;
