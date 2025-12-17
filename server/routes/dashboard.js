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

    if (holes === 9) {
      scoreAdj *= 2;
      ratingAdj *= 2;
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

// --- Normalize rounds by statsMode ---
function normalizeRoundsByMode(rounds, mode) {
  if (mode === "9") return rounds.filter((r) => r.holes === 9);
  if (mode === "18") return rounds.filter((r) => r.holes === 18);

  // Combined: double 9-hole rounds
  return rounds.map((r) => {
    if (r.holes === 9) {
      return {
        ...r,
        holes: 18,
        score: r.score * 2,
        fir_hit: r.fir_hit != null ? r.fir_hit * 2 : null,
        fir_total: r.fir_total * 2,
        gir_hit: r.gir_hit != null ? r.gir_hit * 2 : null,
        gir_total: r.gir_total * 2,
        putts: r.putts != null ? r.putts * 2 : null,
        penalties: r.penalties != null ? r.penalties * 2 : null,
        rating: r.rating * 2,
        par: r.par * 2,
      };
    }
    return r;
  });
}

// GET /api/dashboard
router.get("/", auth, async (req, res) => {
  const userId = req.user.id;
  const statsMode = req.query.statsMode || "combined";

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
    if (err) {
      console.error(err);
      return res.status(500).json({ type: "error", message: "Database error fetching rounds.", details: err.message });
    }

    if (!rounds || rounds.length === 0) {
      return res.json({
        type: "success",
        message: "No rounds found.",
        total_rounds: 0,
        best_score: null,
        worst_score: null,
        average_score: null,
        avg_putts: null,
        avg_penalties: null,
        fir_avg: null,
        gir_avg: null,
        handicap: null,
        all_rounds: [],
        hbh_stats: null,
      });
    }

    const teeIds = rounds.map((r) => r.tee_id);

    const holesQuery = `
      SELECT h.*, t.id AS tee_id
      FROM holes h
      JOIN tees t ON h.tee_id = t.id
      WHERE t.id IN (?)
    `;

    db.query(holesQuery, [teeIds], (err2, holes) => {
      if (err2) {
        console.error(err2);
        return res.status(500).json({ type: "error", message: "Database error fetching holes.", details: err2.message });
      }

      const holesByTee = {};
      holes.forEach((h) => {
        if (!holesByTee[h.tee_id]) holesByTee[h.tee_id] = [];
        holesByTee[h.tee_id].push(h);
      });

      const allRounds = rounds.map((r) => {
        const teeHoles = holesByTee[r.tee_id] ?? [];
        return {
          id: r.id,
          date: r.date,
          holes: r.number_of_holes ?? teeHoles.length ?? 18,
          score: r.score ?? 0,
          fir_hit: r.advanced_stats ? r.fir_hit : null,
          gir_hit: r.advanced_stats ? r.gir_hit : null,
          putts: r.advanced_stats ? r.putts : null,
          penalties: r.advanced_stats ? r.penalties : null,
          fir_total: teeHoles.filter((h) => h.par !== 3).length,
          gir_total: teeHoles.length,
          rating: r.course_rating ?? 72,
          slope: r.slope_rating ?? 113,
          par: r.tee_par ?? 72,
          advanced_stats: r.advanced_stats,
          hole_by_hole: r.hole_by_hole,
          tee: { tee_id: r.tee_id, tee_name: r.tee_name ?? "-" },
          course: {
            club_name: r.club_name ?? "-",
            course_name: r.course_name ?? "-",
            city: r.city ?? "-",
            state: r.state ?? "-",
            address: r.address ?? "-",
          },
        };
      });

      const modeRounds = normalizeRoundsByMode(allRounds, statsMode);
      const combinedRoundsForHandicap = normalizeRoundsByMode(allRounds, "combined");
      const handicap = calculateHandicap(combinedRoundsForHandicap);
      const roundIds = modeRounds.map((r) => r.id);

      if (roundIds.length === 0) {
        // No rounds in this mode; return empty HBH stats
        return res.json({
          type: "success",
          message: "",
          total_rounds: 0,
          best_score: null,
          worst_score: null,
          average_score: null,
          handicap,
          all_rounds: [],
          fir_avg: null,
          gir_avg: null,
          avg_putts: null,
          avg_penalties: null,
          hbh_stats: {
            par3_avg: null,
            par4_avg: null,
            par5_avg: null,
            scoring_breakdown: {
              ace: 0,
              albatross: 0,
              eagle: 0,
              birdie: 0,
              par: 0,
              bogey: 0,
              double_plus: 0,
            },
            hbh_rounds_count: 0,
          },
        });
      }

      const roundHolesQuery = `
        SELECT rh.*, h.par AS hole_par
        FROM round_holes rh
        JOIN holes h ON rh.hole_id = h.id
        WHERE rh.round_id IN (?)
      `;

      db.query(roundHolesQuery, [roundIds], (err3, rhRows) => {
        if (err3) {
          console.error(err3);
          return res.status(500).json({ type: "error", message: "Database error fetching round holes.", details: err3.message });
        }

        // HBH stats calculation (unchanged)
        const parBuckets = { 3: { sum: 0, count: 0 }, 4: { sum: 0, count: 0 }, 5: { sum: 0, count: 0 } };
        const scoring = { ace: 0, albatross: 0, eagle: 0, birdie: 0, par: 0, bogey: 0, double_plus: 0 };
        let hbhRoundCount = 0;

        modeRounds.forEach((r) => {
          if (r.hole_by_hole !== 1) return;
          const weight = 1;
          const rows = rhRows.filter((rh) => rh.round_id === r.id);
          if (!rows.length) return;

          hbhRoundCount += weight;

          rows.forEach((rh) => {
            const score = rh.score;
            const par = rh.hole_par;
            if (score == null || par == null) return;

            if (parBuckets[par]) {
              parBuckets[par].sum += score * weight;
              parBuckets[par].count += weight;
            }

            const diff = score - par;
            if (score === 1) scoring.ace += weight;
            else if (diff <= -3) scoring.albatross += weight;
            else if (diff === -2) scoring.eagle += weight;
            else if (diff === -1) scoring.birdie += weight;
            else if (diff === 0) scoring.par += weight;
            else if (diff === 1) scoring.bogey += weight;
            else scoring.double_plus += weight;
          });
        });

        const hbh_stats = {
          par3_avg: parBuckets[3].count ? parBuckets[3].sum / parBuckets[3].count : null,
          par4_avg: parBuckets[4].count ? parBuckets[4].sum / parBuckets[4].count : null,
          par5_avg: parBuckets[5].count ? parBuckets[5].sum / parBuckets[5].count : null,
          scoring_breakdown: scoring,
          hbh_rounds_count: hbhRoundCount,
        };

        const totalRounds = modeRounds.length;
        const bestScore = totalRounds ? Math.min(...modeRounds.map((r) => r.score)) : null;
        const worstScore = totalRounds ? Math.max(...modeRounds.map((r) => r.score)) : null;
        const averageScore = totalRounds ? modeRounds.reduce((s, r) => s + r.score, 0) / totalRounds : null;

        const firRounds = modeRounds.filter((r) => r.fir_hit != null && r.fir_total != null);
        const girRounds = modeRounds.filter((r) => r.gir_hit != null && r.gir_total != null);
        const puttsRounds = modeRounds.filter((r) => r.putts != null);
        const penaltiesRounds = modeRounds.filter((r) => r.penalties != null);

        const fir_avg =
          firRounds.length
            ? (firRounds.reduce((sum, r) => sum + r.fir_hit, 0) /
               firRounds.reduce((sum, r) => sum + r.fir_total, 0)) * 100
            : null;
        const gir_avg =
          girRounds.length
            ? (girRounds.reduce((sum, r) => sum + r.gir_hit, 0) /
               girRounds.reduce((sum, r) => sum + r.gir_total, 0)) * 100
            : null;
        const avg_putts =
          puttsRounds.length
            ? puttsRounds.reduce((sum, r) => sum + r.putts, 0) / puttsRounds.length
            : null;
        const avg_penalties =
          penaltiesRounds.length
            ? penaltiesRounds.reduce((sum, r) => sum + r.penalties, 0) / penaltiesRounds.length
            : null;

        res.json({
          type: "success",
          message: "",
          total_rounds: totalRounds,
          best_score: bestScore,
          worst_score: worstScore,
          average_score: averageScore,
          handicap,
          all_rounds: modeRounds,
          fir_avg,
          gir_avg,
          avg_putts,
          avg_penalties,
          hbh_stats,
        });
      });
    });
  });
});

module.exports = router;