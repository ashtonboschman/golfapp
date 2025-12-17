import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useMessage } from "../context/MessageContext";
import FriendCard from "../components/FriendCard";

export default function AddFriends() {
  const { auth } = useContext(AuthContext);
  const token = auth?.token;
  const navigate = useNavigate();
  const { showMessage, clearMessage } = useMessage();

  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const BASE_URL = "http://localhost:3000";

  const searchUsers = async (query) => {
    if (!query) {
      setResults([]);
      return;
    }

    setLoading(true);
    clearMessage(); // clear previous messages
    try {
      const res = await fetch(
        `${BASE_URL}/api/friends/search?q=${encodeURIComponent(query)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json();
      if (data.type !== "success") throw new Error(data.message || "Search failed");

      setResults(data.results);
    } catch (err) {
      console.error(err);
      setResults([]);
      showMessage(err.message || "Failed to search users", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    try {
      if (action === "send") {
        const res = await fetch(`${BASE_URL}/api/friends`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ recipientId: id }),
        });

        const data = await res.json();
        if (data.type !== "success") throw new Error(data.message || "Failed to send friend request");

        // Update UI: mark this user as pending
        setResults((prev) =>
          prev.map((u) => (u.id === id ? { ...u, status: "pending" } : u))
        );

        showMessage("Friend request sent", "success");
      }
    } catch (err) {
      console.error(err);
      showMessage(err.message || "Failed to send friend request", "error");
    }
  };

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      searchUsers(search);
    }, 300); // debounce input

    return () => clearTimeout(delayDebounce);
  }, [search]);

  return (
    <div className="page-stack">
      <input
        type="text"
        placeholder="Search users by username"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="form-input mb-3"
      />

      {loading && <p>Searching...</p>}

      {results.map((user) => {
        // Determine type for FriendCard based on status
        let type = "friend"; // default fallback
        if (user.status === "none") type = "none";
        else if (user.status === "pending") type = "outgoing";
        else if (user.status === "incoming") type = "incoming";

        return (
          <FriendCard
            key={user.id}
            friend={user}
            type={type}
            onAction={(id, action) => {
              if (user.status === "none") handleAction(id, "send");
              else handleAction(id, action);
            }}
            showRemove={false}
          />
        );
      })}

      {!loading && results.length === 0 && search && <p>No users found</p>}
    </div>
  );
}