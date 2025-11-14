// client/src/pages/Rounds.jsx
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Rounds() {
  const { auth, logout } = useContext(AuthContext);
  const token = auth?.token;
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  useEffect(() => {
    if (token) fetchRounds();
  }, [token]);

  const fetchRounds = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("http://localhost:3000/api/rounds", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || "Error fetching rounds");
      }

      const data = await res.json();
      setRounds(data);
      if (data.length === 0) setMessage("No rounds found. Add your first round!");
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
      const res = await fetch(`http://localhost:3000/api/rounds/${id}`, {
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
      setMessage(err.message);
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <h2>Rounds</h2>
      {message && <p style={{ color: message.includes("Error") ? "red" : "green" }}>{message}</p>}

      <button onClick={() => navigate("/rounds/add")} style={addBtnStyle}>
        + Add Round
      </button>

      {loading ? (
        <p>Loading rounds...</p>
      ) : rounds.length === 0 ? (
        <p>No rounds available. Please add a round.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Course</th>
              <th style={thStyle}>Par</th>
              <th style={thStyle}>Score</th>
              <th style={thStyle}>To Par</th>
              <th style={thStyle}>FIR Hit</th>
              <th style={thStyle}>GIR Hit</th>
              <th style={thStyle}>Putts</th>
              <th style={thStyle}>Penalties</th>
              <th style={thStyle}>Notes</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rounds.map((round) => {
              const toPar = round.score !== null && round.course_par !== null ? round.score - round.course_par : "-";
              return (
                <tr key={round.id}>
                  <td style={tdStyle}>{new Date(round.date).toLocaleDateString()}</td>
                  <td style={tdStyle}>{round.course_name}</td>
                  <td style={tdStyle}>{round.course_par ?? "-"}</td>
                  <td style={tdStyle}>{round.score ?? "-"}</td>
                  <td style={tdStyle}>{toPar}</td>
                  <td style={tdStyle}>{round.FIR_hit ?? "-"}</td>
                  <td style={tdStyle}>{round.GIR_hit ?? "-"}</td>
                  <td style={tdStyle}>{round.putts ?? "-"}</td>
                  <td style={tdStyle}>{round.penalties ?? "-"}</td>
                  <td style={tdStyle}>{round.notes || "-"}</td>
                  <td style={tdStyle}>
                    <button onClick={() => navigate(`/rounds/edit/${round.id}`)} style={editBtnStyle}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(round.id)} style={deleteBtnStyle}>
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Styles
const thStyle = { borderBottom: "1px solid #ccc", padding: "8px", textAlign: "left" };
const tdStyle = { borderBottom: "1px solid #eee", padding: "8px" };
const addBtnStyle = {
  marginBottom: "20px",
  backgroundColor: "#2ecc71",
  color: "#fff",
  border: "none",
  padding: "10px 16px",
  borderRadius: "4px",
  cursor: "pointer",
};
const editBtnStyle = {
  backgroundColor: "#3498db",
  color: "#fff",
  border: "none",
  padding: "5px 10px",
  borderRadius: "4px",
  cursor: "pointer",
};
const deleteBtnStyle = {
  backgroundColor: "#e74c3c",
  color: "#fff",
  border: "none",
  padding: "5px 10px",
  borderRadius: "4px",
  marginLeft: "5px",
  cursor: "pointer",
};
