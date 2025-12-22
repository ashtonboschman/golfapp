// server/routes/dashboard.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/auth");
const { normalizeRoundsByMode, calculateHandicap } = require("../utils/handicapUtils");

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