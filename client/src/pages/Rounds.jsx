// client/src/pages/Rounds.jsx
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import RoundCard from "../components/RoundCard";
import "../css/Rounds.css";

export default function Rounds() {
  const { auth, logout } = useContext(AuthContext);
  const token = auth?.token;
  const navigate = useNavigate();

  const [rounds, setRounds] = useState([]);
  const [filteredRounds, setFilteredRounds] = useState([]);
  const [tees, setTees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const BASE_URL = "http://localhost:3000";

  // Redirect if not logged in
  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  // Fetch tees and rounds
  useEffect(() => {
    if (token) {
      fetchTees();
      fetchRounds();
    }
  }, [token]);

  // Filter rounds based on search
  useEffect(() => {
    if (!search.trim()) {
      setFilteredRounds(rounds);
    } else {
      const lower = search.toLowerCase();
      setFilteredRounds(
        rounds.filter(
          (r) =>
            (r.course_name || "").toLowerCase().includes(lower) ||
            (r.city || "").toLowerCase().includes(lower)
        )
      );
    }
  }, [search, rounds]);

  // Fetch all tees
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

  // Fetch all rounds
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

      // Sort by date descending
      const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Flatten each round for the RoundCard (but do NOT normalize)
      const flattenedRounds = sorted.map((r) => {
        const teeData = tees.find((t) => t.id === r.tee?.tee_id);
        return {
          id: r.id,
          date: r.date,
          score: r.score != null ? Number(r.score) : null,
          fir_hit: r.fir_hit != null ? Number(r.fir_hit) : null,
          gir_hit: r.gir_hit != null ? Number(r.gir_hit) : null,
          putts: r.putts != null ? Number(r.putts) : null,
          penalties: r.penalties != null ? Number(r.penalties) : null,
          par: r.tee?.par_total ?? null,             // <-- updated
          course_name: r.course?.course_name ?? "-",
          city: r.location?.city ?? "-",             // <-- updated
          tee_id: r.tee?.tee_id ?? null,
          tee_name: teeData?.tee_name ?? r.tee?.tee_name ?? "-",
          notes: r.notes ?? null,
          hole_by_hole: r.hole_by_hole ?? null,
        };
      });

      setRounds(flattenedRounds);
      setFilteredRounds(flattenedRounds);

      if (!data.length) setMessage("No rounds found. Add your first round!");
    } catch (err) {
      console.error("Fetch rounds error:", err);
      setMessage(err.message || "Error fetching rounds");
    } finally {
      setLoading(false);
    }
  };

  // Delete round
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

      {/* Search bar */}
      <input
        type="text"
        placeholder="Search by course or city..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="rounds-search"
      />

      <button onClick={() => navigate("/rounds/add")} className="rounds-add-btn">
        + Add Round
      </button>

      {loading ? (
        <p>Loading rounds...</p>
      ) : filteredRounds.length === 0 ? (
        <p>No rounds match your search.</p>
      ) : (
        <div className="rounds-grid">
          {filteredRounds.map((round) => (
            <RoundCard
              key={round.id}
              round={round}
              onEdit={(id) => navigate(`/rounds/edit/${id}`)}
              onDelete={handleDelete}
              showAdvanced={true} // will display hole-by-hole if exists
            />
          ))}
        </div>
      )}
    </div>
  );
}