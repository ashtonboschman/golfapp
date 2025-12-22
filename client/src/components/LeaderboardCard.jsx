import React from "react";

export default function LeaderboardCard({ user, rank }) {
  const formatNumber = (num, decimals = 0) =>
    num !== null && num !== undefined ? num.toFixed(decimals) : "-";

  const formatHandicap = (hcp) => {
    if (hcp === null || hcp === undefined) return "-";

    const absValue = Math.abs(hcp).toFixed(1);
    return hcp < 0 ? `+${absValue}` : absValue;
  };

  return (
    <div className="card">
      <div className="leaderboard-row">
        <div className="leaderboard-cell left">{rank}</div>

        <div className="leaderboard-cell left">
          <div className="avatar-name-wrapper">
            {user.avatar_url && (
              <img
                src={user.avatar_url}
                alt={`${user.first_name} ${user.last_name}`}
                className="leaderboard-avatar"
              />
            )}

            <div className="name-stack">
              <span className="first-name">{user.first_name}</span>
              <span className="last-name">{user.last_name}</span>
            </div>
          </div>
        </div>

        <div className="leaderboard-cell centered">
          {formatHandicap(user.handicap)}
        </div>

        <div className="leaderboard-cell centered">
          {formatNumber(user.average_score, 1)}
        </div>

        <div className="leaderboard-cell centered">
          {user.best_score ?? "-"}
        </div>

        <div className="leaderboard-cell centered">
          {user.total_rounds}
        </div>
      </div>
    </div>
  );
}