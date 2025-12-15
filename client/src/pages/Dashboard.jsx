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
    hbh_stats: null,
  });

  const BASE_URL = "http://localhost:3000";

  // --- FETCH DASHBOARD STATS ---
  useEffect(() => {
    if (!token) return navigate("/login", { replace: true });

    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/api/dashboard?statsMode=${statsMode}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401 || res.status === 403) {
          logout();
          return navigate("/login", { replace: true });
        }

        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token, navigate, logout, statsMode]);

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

  // --- NORMALIZE ROUNDS FOR DISPLAY ONLY ---
  const displayRounds = (stats.all_rounds ?? []).map((r) => ({
    ...r,
    course_name: r.course?.course_name ?? "-",
    club_name: r.course?.club_name ?? "-",
    city: r.course?.city ?? "-",
    tee_id: r.tee?.tee_id ?? null,
    tee_name: r.tee?.tee_name ?? "-",
  }));

  const sortedRounds = [...displayRounds].sort((a, b) => new Date(b.date) - new Date(a.date));
  const lastRounds = sortedRounds.slice(0, 5);
  const totalRounds = stats.total_rounds;

  const par3_avg = stats.hbh_stats?.par3_avg ?? null;
  const par4_avg = stats.hbh_stats?.par4_avg ?? null;
  const par5_avg = stats.hbh_stats?.par5_avg ?? null;

  const birdiesOrBetterPerRound = stats.hbh_stats?.scoring_breakdown
    ? ((stats.hbh_stats.scoring_breakdown.ace ?? 0) +
        (stats.hbh_stats.scoring_breakdown.albatross ?? 0) +
        (stats.hbh_stats.scoring_breakdown.eagle ?? 0) +
        (stats.hbh_stats.scoring_breakdown.birdie ?? 0)) /
      stats.hbh_stats.hbh_rounds_count
    : null;

  const parPerRound = stats.hbh_stats?.scoring_breakdown
    ? (stats.hbh_stats.scoring_breakdown.par ?? 0) / stats.hbh_stats.hbh_rounds_count
    : null;

  const bogeysPerRound = stats.hbh_stats?.scoring_breakdown
    ? (stats.hbh_stats.scoring_breakdown.bogey ?? 0) / stats.hbh_stats.hbh_rounds_count
    : null;

  const doublesOrWorsePerRound = stats.hbh_stats?.scoring_breakdown
    ? (stats.hbh_stats.scoring_breakdown.double_plus ?? 0) / stats.hbh_stats.hbh_rounds_count
    : null;

  const trendData = [...lastRounds]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((r) => ({
      date: r.date,
      score: r.score,
      fir_pct: r.fir_hit != null && r.fir_total != null ? (r.fir_hit / r.fir_total) * 100 : null,
      gir_pct: r.gir_hit != null && r.gir_total != null ? (r.gir_hit / r.gir_total) * 100 : null,
    }));


  const scores = trendData.map((d) => d.score).filter((v) => v != null);
  const yMin = scores.length ? Math.floor(Math.min(...scores) / 10) * 10 : 0;
  const yMax = scores.length ? Math.ceil(Math.max(...scores) / 10) * 10 : 100;

  return (
    <div className="page-stack">
      <button
        className="btn btn-save"
        onClick={() => navigate("/rounds/add", { state: { from: "/dashboard" } })}
      >
        + Add Round
      </button>

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

      <div className="grid grid-4">
        <div className="card dashboard-stat-card">
          <h3>Handicap</h3>
          <p>{formatHandicap(stats.handicap)}</p>
        </div>
        {[
          ["Average Score", stats.average_score],
          ["Best Score", stats.best_score],
          ["Worst Score", stats.worst_score],
          ["Total Rounds", totalRounds],
          ["Par 3 Average", par3_avg],
          ["Par 4 Average", par4_avg],
          ["Par 5 Average", par5_avg],
        ].map(([label, val]) => (
          <div className="card dashboard-stat-card" key={label}>
            <h3>{label}</h3>
            <p>{formatNumber(val)}</p>
          </div>
        ))}
      </div>

      <div className="section">
        <div className="card last-five-rounds-card">
           <h3>Last 5 Rounds</h3>
        </div>
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

      <div className="card trend-card">
        <h3>Score Trend</h3>
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

      <button className="btn btn-toggle" onClick={() => setShowAdvanced((p) => !p)}>
        {showAdvanced ? "Hide Advanced Stats" : "Show Advanced Stats"}
      </button>

      {showAdvanced && (
        <div className="grid grid-4">
          {[
            ["FIR", stats.fir_avg, "%"],
            ["GIR", stats.gir_avg, "%"],
            ["Putts", stats.avg_putts],
            ["Penalties", stats.avg_penalties],
            ["Birdies <", birdiesOrBetterPerRound],
            ["Pars", parPerRound],
            ["Bogeys", bogeysPerRound],
            ["Doubles +", doublesOrWorsePerRound],
          ].map(([label, val, isPercent]) => (
            <div className="card dashboard-stat-card" key={label}>
              <h3>{label}</h3>
              <p>{isPercent ? formatPercent(val) : formatNumber(val)}</p>
            </div>
          ))}
        </div>
      )}

      {showAdvanced && (
        <div className="card trend-card">
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
      )}
    </div>
  );
}