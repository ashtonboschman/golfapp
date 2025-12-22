import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFriends } from "../context/FriendsContext";
import FriendCard from "../components/FriendCard";

export default function Friends() {
  const { friends, incomingRequests, outgoingRequests, loading, handleAction } = useFriends();
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  // Combine all friends and requests for search
  const allUsers = [...friends, ...incomingRequests, ...outgoingRequests];

  const filteredUsers = search
    ? allUsers.filter(
        u =>
          (u.username || "").toLowerCase().includes(search.toLowerCase()) ||
          (u.first_name || "").toLowerCase().includes(search.toLowerCase()) ||
          (u.last_name || "").toLowerCase().includes(search.toLowerCase())
      )
    : allUsers;

  // Split back into sections for display
  const filteredIncoming = filteredUsers.filter(u => u.type === "incoming");
  const filteredOutgoing = filteredUsers.filter(u => u.type === "outgoing");
  const filteredFriends = filteredUsers.filter(u => u.type === "friend");

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
            <h3>Friend Requests ({filteredIncoming.length + filteredOutgoing.length})</h3>
            {[...filteredIncoming, ...filteredOutgoing].map(user => (
              <FriendCard
                key={user.id}
                friend={user}
                onAction={handleAction}
              />
            ))}
          </div>

          <div className="card">
            <h3>Friends ({filteredFriends.length})</h3>
            <input
              type="text"
              placeholder="Search Friends"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-input mb-2"
            />
            {filteredFriends.map(friend => (
              <FriendCard
                key={friend.id}
                friend={friend}
                onAction={handleAction}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}