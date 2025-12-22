const db = require("../config/db");
const util = require("util");
const query = util.promisify(db.query).bind(db);
const { normalizeRoundsByMode, calculateHandicap } = require("./handicapUtils");

async function recalcLeaderboard(userId) {
  // Fetch rounds for the user
  const rounds = await query(
    `SELECT r.*, t.number_of_holes, t.course_rating AS rating, t.slope_rating AS slope
     FROM rounds r
     LEFT JOIN tees t ON r.tee_id = t.id
     WHERE r.user_id = ? AND r.score IS NOT NULL`,
    [userId]
  );

  if (!rounds.length) {
    // No rounds: clear leaderboard stats
    await query(
      `UPDATE user_leaderboard_stats
       SET average_score = NULL, best_score = NULL, handicap = NULL, total_rounds = 0, updated_date = NOW()
       WHERE user_id = ?`,
      [userId]
    );
    return;
  }

  // Ensure each round has 'holes' property for normalization
  const roundsWithHoles = rounds.map(r => ({
    ...r,
    holes: r.number_of_holes ?? 18
  }));

  // Normalize all rounds to combined mode (doubles 9-hole rounds)
  const combinedRounds = normalizeRoundsByMode(roundsWithHoles, "combined");

  const totalRounds = combinedRounds.length;

  // Sum and best score calculations use normalized rounds
  const sumScore = combinedRounds.reduce((sum, r) => sum + r.score, 0);
  const bestScore = Math.min(...combinedRounds.map(r => r.score));

  // Handicap calculation
  const handicap = calculateHandicap(combinedRounds);

  // Update leaderboard stats
  await query(
    `INSERT INTO user_leaderboard_stats (user_id, average_score, best_score, handicap, total_rounds, updated_date)
     VALUES (?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       average_score = VALUES(average_score),
       best_score = VALUES(best_score),
       handicap = VALUES(handicap),
       total_rounds = VALUES(total_rounds),
       updated_date = NOW()`,
    [userId, sumScore / totalRounds, bestScore, handicap, totalRounds]
  );
}

module.exports = { recalcLeaderboard };