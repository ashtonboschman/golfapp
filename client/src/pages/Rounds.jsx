// client/src/pages/Rounds.jsx
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import RoundCard from "../components/RoundCard";
import "../css/Rounds.css"; // fully separated CSS

export default function Rounds() {
  const { auth, logout } = useContext(AuthContext);
  const token = auth?.token;
  const navigate = useNavigate();

  const [rounds, setRounds] = useState([]);
  const [tees, setTees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const BASE_URL = "http://localhost:3000";

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  useEffect(() => {
    if (token) {
      fetchTees();
      fetchRounds();
    }
  }, [token]);

  const fetchTees = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/tees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error fetching tees");
      setTees(data);
    } catch (err) {
      console.error("Fetch tees error:", err);
    }
  };

  const fetchRounds = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${BASE_URL}/api/rounds`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        logout();
        return navigate("/login", { replace: true });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || "Error fetching rounds");
      }

      const data = await res.json();
      setRounds(data);
      if (!data || data.length === 0) setMessage("No rounds found. Add your first round!");
    } catch (err) {
      console.error("Fetch rounds error:", err);
      setMessage(err.message || "Error fetching rounds");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this round?")) return;

    try {
      const res = await fetch(`${BASE_URL}/api/rounds/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Error deleting round");
      }

      fetchRounds();
    } catch (err) {
      console.error("Delete round error:", err);
      setMessage(err.message || "Error deleting round");
    }
  };

  return (
    <div className="rounds-page">
      <h2 className="rounds-title">Rounds</h2>

      {message && (
        <p
          className={`rounds-message ${
            message.toLowerCase().includes("error") ? "error" : "success"
          }`}
        >
          {message}
        </p>
      )}

      <button
        onClick={() => navigate("/rounds/add")}
        className="rounds-add-btn"
      >
        + Add Round
      </button>

      {loading ? (
        <p>Loading rounds...</p>
      ) : rounds.length === 0 ? (
        <p>No rounds available. Please add a round.</p>
      ) : (
        <div className="rounds-grid">
          {rounds.map((round) => (
            <RoundCard
              key={round.id}
              round={round}
              tees={tees}
              onEdit={(id) => navigate(`/rounds/edit/${id}`)}
              onDelete={handleDelete}
              showAdvanced={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}
