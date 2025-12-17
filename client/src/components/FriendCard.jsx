// client/src/components/FriendCard.jsx
import React from "react";

export default function FriendCard({ friend, type, onAction, showRemove = true }) {
  const handleClick = (action) => {
    if (onAction) onAction(friend.id, action);
  };

  return (
    <div className="friend-card flex align-center justify-between mb-2 p-3">
      {/* Friend info */}
      <div className="friend-info">
        <span className="friend-username font-bold text-lg">{friend.username}</span>
      </div>

      {/* Actions */}
      <div className="friend-actions flex gap-2">
        {type === "none" && (
          <button
            className="btn btn-save"
            onClick={() => handleClick("send")}
          >
            Send Request
          </button>
        )}

        {type === "incoming" && (
          <>
            <button
              className="btn btn-accept"
              onClick={() => handleClick("accept")}
            >
              Accept
            </button>
            <button
              className="btn btn-reject"
              onClick={() => handleClick("decline")}
            >
              Reject
            </button>
          </>
        )}

        {type === "outgoing" && (
          <button
            className="btn btn-cancel"
            onClick={() => handleClick("cancel")}
          >
            Cancel
          </button>
        )}

        {type === "friend" && (
          showRemove ? (
            <button
              className="btn btn-remove"
              onClick={() => handleClick("remove")}
            >
              Remove
            </button>
          ) : (
            <button
              className="btn btn-disabled"
              disabled
            >
              Friends
            </button>
          )
        )}
      </div>
    </div>
  );
}