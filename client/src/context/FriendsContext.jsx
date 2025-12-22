import { createContext, useContext, useState, useEffect } from "react";
import { AuthContext } from "./AuthContext";
import { useMessage } from "./MessageContext";
import { normalizeFriend } from "../utils/friendUtils";

const FriendsContext = createContext();
export const useFriends = () => useContext(FriendsContext);

export function FriendsProvider({ children }) {
  const { auth } = useContext(AuthContext);
  const token = auth?.token;
  const { showMessage, clearMessage } = useMessage();

  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const BASE_URL = "http://localhost:3000";

  /** Fetch all friends and requests */
  const fetchAll = async () => {
    if (!token) return;
    setLoading(true);
    clearMessage();

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

      setFriends(friendsData.results.map(u => normalizeFriend({ ...u, type: "friend" })));
      setIncomingRequests(incomingData.results.map(u => normalizeFriend({ ...u, type: "incoming" })));
      setOutgoingRequests(outgoingData.results.map(u => normalizeFriend({ ...u, type: "outgoing" })));
    } catch (err) {
      console.error(err);
      showMessage(err.message || "Failed to fetch friends", "error");
    } finally {
      setLoading(false);
    }
  };

  /** Handle actions with consistent state updates */
  const handleAction = async (id, action, extra = {}) => {
    try {
      let url, method = "POST", body;

      switch (action) {
        case "send":
          url = `${BASE_URL}/api/friends`;
          body = JSON.stringify({ recipientId: id });
          break;
        case "accept":
          url = `${BASE_URL}/api/friends/${id}/accept`;
          break;
        case "decline":
          url = `${BASE_URL}/api/friends/${id}/decline`;
          break;
        case "cancel":
          url = `${BASE_URL}/api/friends/${id}/cancel`;
          break;
        case "remove":
          url = `${BASE_URL}/api/friends/${id}`;
          method = "DELETE";
          break;
        default:
          throw new Error("Invalid action");
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": body ? "application/json" : undefined,
          Authorization: `Bearer ${token}`,
        },
        body,
      });

      const data = await res.json();
      showMessage(data.message, data.type);
      if (data.type !== "success") throw new Error(data.message);

      // ===== Consistent state updates =====
      switch (action) {
        case "send": {
          const request = data.request;

          setOutgoingRequests(prev => {
            if (prev.some(r => r.id === request.id)) return prev;
            return [
              {
                id: request.id,
                user_id: request.user_id,
                username: request.username,
                first_name: request.first_name,
                last_name: request.last_name,
                avatar_url: request.avatar_url,
                created_date: request.created_date,
                type: "outgoing"
              },
              ...prev
            ];
          });

          setIncomingRequests(prev => prev.filter(r => r.user_id !== request.user_id));
          setFriends(prev => prev.filter(f => f.id !== request.user_id));
          break;
        }

        case "accept": {
          const friend = data.friend || extra;
          if (!friend) break;

          setFriends(prev => [
            ...prev.filter(f => f.id !== friend.id),
            normalizeFriend({ ...friend, type: "friend" })
          ]);

          setIncomingRequests(prev => prev.filter(r => r.id !== id));
          setOutgoingRequests(prev => prev.filter(r => r.id !== id));
          break;
        }

        case "decline":
          setIncomingRequests(prev => prev.filter(r => r.id !== id));
          break;

        case "cancel":
          setOutgoingRequests(prev => prev.filter(r => r.id !== id));
          break;

        case "remove":
          setFriends(prev => prev.filter(f => f.id !== id));
          setIncomingRequests(prev => prev.filter(r => r.id !== id));
          setOutgoingRequests(prev => prev.filter(r => r.id !== id));
          break;
      }
    } catch (err) {
      console.error(err);
      showMessage(err.message || "Action failed", "error");
    }
  };


  useEffect(() => {
    fetchAll();
  }, [token]);

  return (
    <FriendsContext.Provider value={{
      friends,
      incomingRequests,
      outgoingRequests,
      loading,
      handleAction,
      fetchAll
    }}>
      {children}
    </FriendsContext.Provider>
  );
}