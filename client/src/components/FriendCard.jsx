import React, { useState } from "react";

export default function FriendCard({ friend, onAction, showDetails = true }) {
  const type = friend.type || "none";
  const [loading, setLoading] = useState(false);

  const handleClick = async (action) => {
    if (!onAction || loading) return;

    setLoading(true);
    try {
      // Call context handler
      await onAction(friend.id, action);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="friend-card">
      <div className="friend-info">
        <img
          className="friend-img"
          src={friend.avatar_url || "/avatars/default.png"}
          alt={`${friend.first_name || ""} ${friend.last_name || ""}`}
        />
        <div className="friend-name">
          {friend.first_name} {friend.last_name}
        </div>
      </div>

      <div className="friend-actions">
        {type === "none" && (
          <button
            className="btn btn-save"
            onClick={() => handleClick("send")}
            disabled={loading}
          >
            {loading ? "Sending..." : "Add"}
          </button>
        )}
        {type === "incoming" && 
          (showDetails ? (
            <>
              <button
                className="btn btn-accept"
                onClick={() => handleClick("accept")}
                disabled={loading}
              >
                {loading ? "Accepting..." : "Accept"}
              </button>
              <button
                className="btn btn-reject"
                onClick={() => handleClick("decline")}
                disabled={loading}
              >
                {loading ? "Declining..." : "Decline"}
              </button>
            </>
          ) : (
            <button className="btn btn-disabled" disabled>
              Pending
            </button>
          ))}
        {type === "outgoing" &&
          (showDetails ? (
            <button
              className="btn btn-cancel"
              onClick={() => handleClick("cancel")}
              disabled={loading}
            >
              {loading ? "Cancelling..." : "Cancel"}
            </button>
          ) : (
            <button className="btn btn-disabled" disabled>
              Pending
            </button>
          ))}
        {type === "friend" &&
          (showDetails ? (
            <button
              className="btn btn-remove"
              onClick={() => handleClick("remove")}
              disabled={loading}
            >
              {loading ? "Removing..." : "Remove"}
            </button>
          ) : (
            <button className="btn btn-friends" disabled>
              Friends
            </button>
          ))}
      </div>
    </div>
  );
}