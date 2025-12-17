import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useMessage } from "../context/MessageContext";
import FriendCard from "../components/FriendCard";

export default function Friends() {
  const { auth } = useContext(AuthContext);
  const token = auth?.token;
  const navigate = useNavigate();
  const { showMessage, clearMessage } = useMessage();

  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const BASE_URL = "http://localhost:3000";

  const fetchAll = async () => {
    setLoading(true);
    clearMessage(); // clear old messages
    try {
      const [friendsRes, incomingRes, outgoingRes] = await Promise.all([
        fetch(`${BASE_URL}/api/friends`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/friends/incoming`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/friends/outgoing`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [friendsData, incomingData, outgoingData] = await Promise.all([
        friendsRes.json(),
        incomingRes.json(),
        outgoingRes.json(),
      ]);

      if (friendsData.type !== "success") throw new Error(friendsData.message || "Failed to fetch friends");
      if (incomingData.type !== "success") throw new Error(incomingData.message || "Failed to fetch incoming requests");
      if (outgoingData.type !== "success") throw new Error(outgoingData.message || "Failed to fetch outgoing requests");

      setFriends(friendsData.results);
      setIncomingRequests(incomingData.results);
      setOutgoingRequests(outgoingData.results);

    } catch (err) {
      console.error(err);
      showMessage(err.message || "Failed to fetch friends", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    try {
      let url, method = "POST";

      if (action === "accept") {
        url = `${BASE_URL}/api/friends/${id}/accept`;
        const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        showMessage(data.message, data.type);
        if (data.type !== "success") throw new Error(data.message);

        const acceptedReq = incomingRequests.find(r => r.id === id);
        setIncomingRequests(prev => prev.filter(r => r.id !== id));
        if (acceptedReq) setFriends(prev => [...prev, { id: acceptedReq.user_id, username: acceptedReq.username }]);

      } else if (action === "decline") {
        url = `${BASE_URL}/api/friends/${id}/decline`;
        const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        showMessage(data.message, data.type);
        if (data.type !== "success") throw new Error(data.message);
        setIncomingRequests(prev => prev.filter(r => r.id !== id));

      } else if (action === "cancel") {
        url = `${BASE_URL}/api/friends/${id}/cancel`;
        const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        showMessage(data.message, data.type);
        if (data.type !== "success") throw new Error(data.message);
        setOutgoingRequests(prev => prev.filter(r => r.id !== id));

      } else if (action === "remove") {
        url = `${BASE_URL}/api/friends/${id}`;
        method = "DELETE";
        const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        showMessage(data.message, data.type);
        if (data.type !== "success") throw new Error(data.message);
        setFriends(prev => prev.filter(f => f.id !== id));
      }
    } catch (err) {
      console.error(err);
      showMessage(err.message || "Action failed", "error");
    }
  };

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
    else fetchAll();
  }, [token]);

  const filteredFriends = search
    ? friends.filter(f => f.username.toLowerCase().includes(search.toLowerCase()))
    : friends;

  return (
    <div className="page-stack">
      <div className="flex space-between mb-3">
        <button className="btn btn-save" onClick={() => navigate("/friends/add")}>
          + Add Friend
        </button>
      </div>

      {loading ? (
        <p>Loading friends...</p>
      ) : (
        <>
          <div className="card mb-3">
            <h3>Friend Requests ({incomingRequests.length + outgoingRequests.length})</h3>
            {[...incomingRequests.map(r => ({ ...r, type: "incoming" })), 
              ...outgoingRequests.map(r => ({ ...r, type: "outgoing" }))
            ].map(req => (
              <FriendCard 
                key={req.id} 
                friend={req} 
                type={req.type} 
                onAction={handleAction} 
              />
            ))}
          </div>

          <div className="card">
            <h3>Friends ({friends.length})</h3>
            <input
              type="text"
              placeholder="Search Friends"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input mb-2"
            />
            {filteredFriends.map(friend => (
              <FriendCard key={friend.id} friend={friend} type="friend" onAction={handleAction} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}