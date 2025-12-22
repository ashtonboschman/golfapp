import { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useFriends } from "../context/FriendsContext";
import FriendCard from "../components/FriendCard";

export default function AddFriends() {
  const { auth, logout } = useContext(AuthContext);
  const { handleAction } = useFriends();
  const token = auth?.token;

  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const BASE_URL = "http://localhost:3000";

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  const searchUsers = useCallback(async (query) => {
    if (!query || !token) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${BASE_URL}/api/friends/search?q=${encodeURIComponent(query)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.status === 401 || res.status === 403) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Search failed");

      // Use API status directly
      setResults(data.results.map(u => ({
        ...u,
        type: u.status || "none"
      })));
    } catch (err) {
      console.error("Search failed:", err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [token, logout, navigate]);

  // Debounce search
  useEffect(() => {
    const delay = setTimeout(() => searchUsers(search), 300);
    return () => clearTimeout(delay);
  }, [search, searchUsers]);

  const handleAddClick = async (userId) => {
    const user = results.find(u => u.id === userId);
    if (!user) return;

    // Optimistically update local state to show Pending
    setResults(prev => prev.map(u =>
      u.id === userId ? { ...u, type: "outgoing" } : u
    ));

    // Send full user info so FriendsContext can update outgoingRequests properly
    await handleAction(userId, "send", {
      first_name: user.first_name,
      last_name: user.last_name,
      avatar_url: user.avatar_url,
      username: user.username
    });
  };

  return (
    <div className="page-stack">
      <input
        type="text"
        placeholder="Search users by username, first name, or last name"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="form-input mb-3"
      />

      {loading && <p>Searching...</p>}

      {results.map(user => (
        <FriendCard
          key={user.id}
          friend={user}
          onAction={(id, action) => {
            if (action === "send") return handleAddClick(id);
            return handleAction(id, action);
          }}
          showDetails={false}
        />
      ))}

      {!loading && search && results.length === 0 && <p>No users found</p>}
    </div>
  );
}