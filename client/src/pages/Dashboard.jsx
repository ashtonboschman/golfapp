import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import RoundCard from "../components/RoundCard";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "../css/Dashboard.css";

export default function Dashboard() {
  const { auth, logout } = useContext(AuthContext);
  const token = auth?.token;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [statsMode, setStatsMode] = useState("combined");
  const [tees, setTees] = useState([]);
  const [stats, setStats] = useState({
    handicap: null,
    handicap_message: null,
    total_rounds: 0,
    best_score: null,
    worst_score: null,
    average_score: null,
    all_rounds: [],
    fir_avg: null,
    gir_avg: null,
    avg_putts: null,
    avg_penalties: null,
  });

  const BASE_URL = "http://localhost:3000";

  // --- FETCH DASHBOARD STATS ---
  useEffect(() => {
    if (!token) return navigate("/login", { replace: true });

    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/api/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401 || res.status === 403) {
          logout();
          return navigate("/login", { replace: true });
        }

        const data = await res.json();
        setStats({
          handicap: data.handicap ?? null,
          handicap_message: data.handicap_message ?? null,
          total_rounds: Number(data.total_rounds) || 0,
          best_score: data.best_score != null ? Number(data.best_score) : null,
          worst_score: data.worst_score != null ? Number(data.worst_score) : null,
          average_score: data.average_score != null ? Number(data.average_score) : null,
          all_rounds: Array.isArray(data.all_rounds) ? data.all_rounds : [],
          fir_avg: data.fir_avg ?? null,
          gir_avg: data.gir_avg ?? null,
          avg_putts: data.avg_putts ?? null,
          avg_penalties: data.avg_penalties ?? null,
        });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token, navigate, logout]);

  // --- FETCH TEES ---
  useEffect(() => {
    if (!token) return;

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

    fetchTees();
  }, [token]);

  if (loading) return <p className="loading-text">Loading dashboard...</p>;

  // --- FORMATTERS ---
  const formatNumber = (num) => (num == null ? "-" : num % 1 === 0 ? num : num.toFixed(1));
  const formatPercent = (num) => (num == null ? "-" : `${num.toFixed(1)}%`);
  const formatDate = (dateStr) =>
    !dateStr
      ? "-"
      : new Date(dateStr).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
  const formatHandicap = (num) => {
    if (num == null) return "-";
    if (num < 0) return `+${Math.abs(num)}`;
    return num % 1 === 0 ? num : num.toFixed(1);
  };

  // --- NORMALIZE ROUNDS ---
  const normalizeRounds = stats.all_rounds
    .map((r) => ({
      id: r.id,
      date: r.date,
      score: r.score != null ? Number(r.score) : null,
      fir_hit: r.fir_hit != null ? Number(r.fir_hit) : null,
      fir_total: r.fir_total != null ? Number(r.fir_total) : null,
      gir_hit: r.gir_hit != null ? Number(r.gir_hit) : null,
      gir_total: r.gir_total != null ? Number(r.gir_total) : null,
      putts: r.putts != null ? Number(r.putts) : null,
      penalties: r.penalties != null ? Number(r.penalties) : null,
      holes: r.holes != null ? Number(r.holes) : 18,
      rating: r.rating != null ? Number(r.rating) : null,
      slope: r.slope != null ? Number(r.slope) : null,
      par: r.par != null ? Number(r.par) : null,
      course_name: r.course?.course_name ?? "-",
      club_name: r.course?.club_name ?? "-",
      city: r.course?.city ?? "-",
      tee_id: r.tee?.tee_id ?? null,
      tee_name: r.tee?.tee_name ?? "-",
      notes: r.notes ?? null,
    }))
    .filter((r) =>
      statsMode === "9" ? r.holes === 9 : statsMode === "18" ? r.holes === 18 : true
    )
    .map((r) =>
      statsMode === "combined" && r.holes === 9
        ? {
            ...r,
            score: r.score != null ? r.score * 2 : null,
            fir_hit: r.fir_hit != null ? r.fir_hit * 2 : null,
            fir_total: r.fir_total != null ? r.fir_total * 2 : null,
            gir_hit: r.gir_hit != null ? r.gir_hit * 2 : null,
            gir_total: r.gir_total != null ? r.gir_total * 2 : null,
            putts: r.putts != null ? r.putts * 2 : null,
            penalties: r.penalties != null ? r.penalties * 2 : null,
            holes: 18,
            rating: r.rating != null ? r.rating * 2 : null,
            par: r.par != null ? r.par * 2 : null,
          }
        : r
    );

  const sortedRounds = [...normalizeRounds].sort((a, b) => new Date(b.date) - new Date(a.date));
  const lastRounds = sortedRounds.slice(0, 5);

  const totalRounds =
    statsMode === "9"
      ? normalizeRounds.filter((r) => r.holes === 9).length
      : statsMode === "18"
      ? normalizeRounds.filter((r) => r.holes === 18).length
      : normalizeRounds.length;

  // --- ADVANCED STATS ---
  const firRounds = normalizeRounds.filter((r) => r.fir_hit != null && r.fir_total != null);
  const girRounds = normalizeRounds.filter((r) => r.gir_hit != null && r.gir_total != null);
  const puttsRounds = normalizeRounds.filter((r) => r.putts != null);
  const penaltiesRounds = normalizeRounds.filter((r) => r.penalties != null);

  const fir_avg = firRounds.length
    ? (firRounds.reduce((sum, r) => sum + r.fir_hit, 0) /
        firRounds.reduce((sum, r) => sum + r.fir_total, 0)) *
      100
    : null;

  const gir_avg = girRounds.length
    ? (girRounds.reduce((sum, r) => sum + r.gir_hit, 0) /
        girRounds.reduce((sum, r) => sum + r.gir_total, 0)) *
      100
    : null;

  const avgPutts = puttsRounds.length
    ? puttsRounds.reduce((sum, r) => sum + r.putts, 0) / puttsRounds.length
    : null;

  const avgPenalties = penaltiesRounds.length
    ? penaltiesRounds.reduce((sum, r) => sum + r.penalties, 0) / penaltiesRounds.length
    : null;

  // --- TREND DATA (handles 9-hole doubling in combined mode) ---
  const trendData = [...lastRounds]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((r) => {
      const multiplier = statsMode === "combined" && r.holes === 18 && r.score % 2 === 0 ? 1 : 1;
      return {
        date: r.date,
        score: r.score,
        fir_pct:
          r.fir_hit != null && r.fir_total != null ? (r.fir_hit / r.fir_total) * 100 : null,
        gir_pct:
          r.gir_hit != null && r.gir_total != null ? (r.gir_hit / r.gir_total) * 100 : null,
      };
    });

  const scores = trendData.map((d) => d.score).filter((v) => v != null);
  const yMin = scores.length ? Math.floor(Math.min(...scores) / 10) * 10 : 0;
  const yMax = scores.length ? Math.ceil(Math.max(...scores) / 10) * 10 : 100;

  return (
    <div className="dashboard-container">
      <h2>My Dashboard</h2>

      <button
        className="add-round-btn"
        onClick={() => navigate("/rounds/add", { state: { from: "/dashboard" } })}
      >
        + Add Round
      </button>

      <div className="handicap-card">
        <div className="handicap-label">Handicap</div>
        <div className="handicap-value">{formatHandicap(stats.handicap)}</div>
        {stats.handicap_message && <div className="handicap-message">{stats.handicap_message}</div>}
      </div>

      <div className="stats-tabs">
        {["9", "18", "combined"].map((m) => (
          <button
            key={m}
            onClick={() => setStatsMode(m)}
            disabled={statsMode === m}
            className={`stats-tab ${statsMode === m ? "active" : ""}`}
          >
            {m === "combined" ? "Combined" : `${m}-Hole`}
          </button>
        ))}
      </div>

      {statsMode === "combined" && (
        <p className="combined-note">9-hole rounds are doubled to approximate 18-hole stats.</p>
      )}

      <div className="basic-stats-grid">
        {[
          [
            "Average Score",
            normalizeRounds.length
              ? normalizeRounds.reduce((sum, r) => sum + (r.score || 0), 0) / normalizeRounds.length
              : null,
          ],
          [
            "Best Score",
            normalizeRounds.length ? Math.min(...normalizeRounds.map((r) => r.score)) : null,
          ],
          [
            "Worst Score",
            normalizeRounds.length ? Math.max(...normalizeRounds.map((r) => r.score)) : null,
          ],
          ["Total Rounds", totalRounds],
        ].map(([label, val]) => (
          <div className="stat-card" key={label}>
            <h3>{label}</h3>
            <p>{formatNumber(val)}</p>
          </div>
        ))}
      </div>

      <div className="last-rounds-section">
        <h3>Last 5 Rounds</h3>
        {lastRounds.length === 0 ? (
          <p>No rounds recorded.</p>
        ) : (
          <div className="rounds-list">
            {lastRounds.map((round) => (
              <RoundCard
                key={round.id}
                round={round}
                tees={tees}
                showAdvanced={showAdvanced}
                showActions={false}
              />
            ))}
          </div>
        )}
      </div>

      <div className="trend-card">
        <h3>Score Trend (Last 5 Rounds)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={formatDate} />
            <YAxis domain={[yMin, yMax]} />
            <Tooltip labelFormatter={formatDate} formatter={(v) => formatNumber(v)} />
            <Legend />
            <Line type="monotone" dataKey="score" name="Score" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <button className="toggle-advanced-btn" onClick={() => setShowAdvanced((p) => !p)}>
        {showAdvanced ? "Hide Advanced Stats" : "Show Advanced Stats"}
      </button>

      {showAdvanced && (
        <>
          <div className="advanced-stats-grid">
            {[
              ["FIR %", fir_avg],
              ["GIR %", gir_avg],
              ["Putts / Round", avgPutts],
              ["Penalties / Round", avgPenalties],
            ].map(([label, val]) => (
              <div className="stat-card" key={label}>
                <h3>{label}</h3>
                <p>{label.includes("%") ? formatPercent(val) : formatNumber(val)}</p>
              </div>
            ))}
          </div>

          <div className="trend-card">
            <h3>FIR / GIR % Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  labelFormatter={formatDate}
                  formatter={(v) => (v != null ? formatPercent(v) : "-")}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="fir_pct"
                  name="FIR %"
                  stroke="#8884d8"
                  dot={{ r: 3 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="gir_pct"
                  name="GIR %"
                  stroke="#82ca9d"
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}