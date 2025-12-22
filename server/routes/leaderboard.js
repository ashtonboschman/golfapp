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
// GET global leaderboard stats (only users with total_rounds > 0)
// ============================================================================
router.get("/", auth, async (req, res) => {
  try {
    const sql = `
      SELECT 
        uls.user_id,
        uls.handicap,
        uls.average_score,
        uls.best_score,
        uls.total_rounds,
        up.first_name,
        up.last_name,
        up.avatar_url
      FROM user_leaderboard_stats uls
      INNER JOIN user_profiles up ON uls.user_id = up.user_id
      WHERE uls.total_rounds > 0
    `;

    const users = await query(sql);

    // Default sorting: handicap asc, average_score asc, total_rounds desc, best_score asc
    users.sort((a, b) => {
      const h1 = a.handicap ?? 999;
      const h2 = b.handicap ?? 999;
      if (h1 !== h2) return h1 - h2;

      const avg1 = a.average_score ?? 999;
      const avg2 = b.average_score ?? 999;
      if (avg1 !== avg2) return avg1 - avg2;

      if (a.total_rounds !== b.total_rounds) return b.total_rounds - a.total_rounds;

      const best1 = a.best_score ?? 999;
      const best2 = b.best_score ?? 999;
      return best1 - best2;
    });

    res.json({ type: "success", users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: "error", message: "Database error", details: err });
  }
});

module.exports = router;