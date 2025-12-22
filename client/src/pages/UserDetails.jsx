import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useFriends } from "../context/FriendsContext";

export default function UserDetails() {
  const { auth, logout } = useContext(AuthContext);
  const { friends, incomingRequests, outgoingRequests, handleAction } = useFriends();
  const token = auth?.token;
  const { id: userId } = useParams();
  const navigate = useNavigate();

  const [userDetails, setUserDetails] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentRounds, setRecentRounds] = useState([]);
  const [favoriteCourse, setFavoriteCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  const BASE_URL = "http://localhost:3000";

  // Determine friend status
  const friendStatus = (() => {
    if (friends.some(f => f.id === Number(userId))) return "friend";
    if (incomingRequests.some(r => r.user_id === Number(userId))) return "incoming";
    if (outgoingRequests.some(r => r.user_id === Number(userId))) return "outgoing";
    return "none";
  })();

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const fetchUserDetails = async () => {
      setLoading(true);
      try {
        // 1. Fetch profile
        const profileRes = await fetch(`${BASE_URL}/api/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!profileRes.ok) throw new Error("Failed to fetch user profile");
        const profileData = await profileRes.json();
        setUserDetails(profileData);

        // 2. Fetch stats
        const statsRes = await fetch(`${BASE_URL}/api/users/${userId}/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!statsRes.ok) throw new Error("Failed to fetch stats");
        const statsData = await statsRes.json();
        setStats(statsData);

        // 3. Fetch recent rounds
        const roundsRes = await fetch(`${BASE_URL}/api/users/${userId}/rounds?limit=5`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!roundsRes.ok) throw new Error("Failed to fetch recent rounds");
        const roundsData = await roundsRes.json();
        setRecentRounds(roundsData);

        // 4. Fetch favorite course (if exists)
        if (profileData.favorite_course_id) {
          const courseRes = await fetch(`${BASE_URL}/api/courses/${profileData.favorite_course_id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (courseRes.ok) {
            const courseData = await courseRes.json();
            setFavoriteCourse(courseData);
          }
        }
      } catch (err) {
        console.error(err);
        navigate("/"); // fallback
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [token, userId, navigate]);

  if (loading || !userDetails) return <p>Loading user details...</p>;

  return (
    <div className="page-stack">
      {/* Header */}
      <div className="user-header flex space-between mb-3">
        <div className="user-info flex">
          <img src={userDetails.avatar_url} alt="Avatar" className="avatar mr-3" />
          <div>
            <h2>{userDetails.first_name} {userDetails.last_name} <span className="username">@{userDetails.username}</span></h2>
            {userDetails.bio && <p>{userDetails.bio}</p>}
          </div>
        </div>

        {/* Friend action button */}
        <div>
          {friendStatus === "none" && <button onClick={() => handleAction(Number(userId), "send")}>Add Friend</button>}
          {friendStatus === "outgoing" && <button onClick={() => handleAction(Number(userId), "cancel")}>Cancel Request</button>}
          {friendStatus === "incoming" && (
            <>
              <button onClick={() => handleAction(Number(userId), "accept")}>Accept</button>
              <button onClick={() => handleAction(Number(userId), "decline")}>Decline</button>
            </>
          )}
          {friendStatus === "friend" && <button onClick={() => handleAction(Number(userId), "remove")}>Remove Friend</button>}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="card mb-3">
          <h3>Stats</h3>
          <p>Handicap: {stats.handicap}</p>
          <p>Average Score: {stats.average_score}</p>
          <p>Best Score: {stats.best_score}</p>
          <p>Total Rounds: {stats.total_rounds}</p>
        </div>
      )}

      {/* Favorite Course */}
      {favoriteCourse && (
        <div className="card mb-3">
          <h3>Favorite Course</h3>
          <p>{favoriteCourse.club_name} - {favoriteCourse.course_name}</p>
        </div>
      )}

      {/* Recent Rounds */}
      <div className="card">
        <h3>Recent Rounds</h3>
        {recentRounds.length === 0 && <p>No rounds played yet</p>}
        <ul>
          {recentRounds.map(round => (
            <li key={round.id}>
              {round.date} - Score: {round.score} - Course: {round.course_name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}