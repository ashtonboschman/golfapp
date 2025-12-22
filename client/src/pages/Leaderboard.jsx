import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import LeaderboardCard from "../components/LeaderboardCard";
import LeaderboardHeader from "../components/LeaderboardHeader";

export default function LeaderboardPage() {
  const { auth } = useContext(AuthContext);
  const token = auth?.token;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sortBy, setSortBy] = useState("handicap"); // default sort
  const [sortOrder, setSortOrder] = useState("asc");

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/leaderboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.type === "success") setUsers(data.users);
      } catch (err) {
        console.error("Fetch leaderboard error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchLeaderboard();
  }, [token]);

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];

    if (valA === null || valA === undefined) valA = 999;
    if (valB === null || valB === undefined) valB = 999;

    if (sortBy === "handicap" || sortBy === "average_score" || sortBy === "best_score" || sortBy === "total_rounds") {
      return sortOrder === "asc" ? valA - valB : valB - valA;
    }

    return 0; // default fallback
  });

  if (loading) return <p className="loading-text">Loading leaderboard...</p>;

  return (
    <div className="page-stack">
      <LeaderboardHeader
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
      />

      {sortedUsers.map((user, index) => (
        <LeaderboardCard key={user.user_id} user={user} rank={index + 1} />
      ))}
    </div>
  );
}