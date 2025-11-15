import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const { auth, logout } = useContext(AuthContext);
  const token = auth?.token;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    handicap: null,
    handicap_message: null,
    total_rounds: 0,
    best_score: null,
    worst_score: null,
    average_score: null,
    last_5_rounds: [],
  });

  const [statsMode, setStatsMode] = useState("combined");
  const BASE_URL = "http://localhost:3000";

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });

    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/api/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          logout();
          navigate("/login", { replace: true });
          return;
        }
        const data = await res.json();
        setStats({
          handicap: data.handicap ?? null,
          handicap_message: data.handicap_message ?? null,
          total_rounds: Number(data.total_rounds) || 0,
          best_score: data.best_score !== null ? Number(data.best_score) : null,
          worst_score: data.worst_score !== null ? Number(data.worst_score) : null,
          average_score: data.average_score !== null ? Number(data.average_score) : null,
          last_5_rounds: Array.isArray(data.last_5_rounds) ? data.last_5_rounds : [],
        });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token, navigate, logout]);

  if (loading) return <p>Loading dashboard...</p>;

  const cardStyle = { flex: "1 1 200px", background: "#fff", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" };
  const thStyle = { borderBottom: "1px solid #ccc", padding: "8px", textAlign: "left" };
  const tdStyle = { borderBottom: "1px solid #eee", padding: "8px" };

  const formatNumber = num => (num === null || num === undefined ? "-" : num % 1 === 0 ? num : num.toFixed(1));
  const formatPercent = num => (num === null || num === undefined ? "-" : `${num.toFixed(1)}%`);
  const formatDate = dateStr => (!dateStr ? "-" : new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));

  const formatHandicap = num => {
    if (num === null || num === undefined) return "-";
    if (num < 0) return `+${Math.abs(num)}`;
    return num % 1 === 0 ? num : num.toFixed(1);
  };

  // Filter rounds by tab and double 9-hole rounds for combined mode
  const filteredRounds = stats.last_5_rounds
    .map(r => {
      const holes = r.holes ?? 18;
      if (statsMode === "9") return holes === 9 ? r : null;
      if (statsMode === "18") return holes === 18 ? r : null;
      if (statsMode === "combined") {
        if (holes === 18) return r;
        if (holes === 9)
          return {
            ...r,
            score: r.score * 2,
            FIR_hit: r.FIR_hit !== null ? r.FIR_hit * 2 : null,
            FIR_total: r.FIR_total !== null ? r.FIR_total * 2 : null,
            GIR_hit: r.GIR_hit !== null ? r.GIR_hit * 2 : null,
            GIR_total: r.GIR_total !== null ? r.GIR_total * 2 : null,
            putts: r.putts !== null ? r.putts * 2 : null,
            penalties: r.penalties !== null ? r.penalties * 2 : null,
          };
      }
      return null;
    })
    .filter(Boolean);

  // FIR & GIR averages
  const firRounds = filteredRounds.filter(r => r.FIR_hit !== null && r.FIR_total !== null);
  const FIR_avg_tab = firRounds.length ? (firRounds.reduce((sum, r) => sum + r.FIR_hit, 0) / firRounds.reduce((sum, r) => sum + r.FIR_total, 0)) * 100 : null;

  const girRounds = filteredRounds.filter(r => r.GIR_hit !== null && r.GIR_total !== null);
  const GIR_avg_tab = girRounds.length ? (girRounds.reduce((sum, r) => sum + r.GIR_hit, 0) / girRounds.reduce((sum, r) => sum + r.GIR_total, 0)) * 100 : null;

  const puttsRounds = filteredRounds.filter(r => r.putts !== null);
  const avgPutts_tab = puttsRounds.length ? puttsRounds.reduce((sum,r) => sum+r.putts,0)/puttsRounds.length : null;

  const penaltiesRounds = filteredRounds.filter(r => r.penalties !== null);
  const avgPenalties_tab = penaltiesRounds.length ? penaltiesRounds.reduce((sum,r)=>sum+r.penalties,0)/penaltiesRounds.length : null;

  // Prepare trend data
  const trendData = filteredRounds
    .map(r => ({
      date: r.date,
      score: r.score,
      FIR_pct: r.FIR_hit !== null && r.FIR_total !== null ? (r.FIR_hit / r.FIR_total) * 100 : null,
      GIR_pct: r.GIR_hit !== null && r.GIR_total !== null ? (r.GIR_hit / r.GIR_total) * 100 : null,
    }))
    .sort((a,b)=> new Date(a.date)-new Date(b.date));

  const hasFirGirData = trendData.some(d => d.FIR_pct !== null || d.GIR_pct !== null);

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "auto" }}>
      <h2>My Dashboard</h2>
      <div style={{ marginTop: "20px", marginBottom: "20px", fontSize: "18px", fontWeight: "bold" }}>
        Handicap: {formatHandicap(stats.handicap)}
        {stats.handicap_message && <div style={{ fontSize: "14px", color: "#888", marginTop: "4px" }}>{stats.handicap_message}</div>}
      </div>

      <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
        <button onClick={() => setStatsMode("9")} disabled={statsMode==="9"}>9-Hole Stats</button>
        <button onClick={() => setStatsMode("18")} disabled={statsMode==="18"}>18-Hole Stats</button>
        <button onClick={() => setStatsMode("combined")} disabled={statsMode==="combined"}>Combined Stats</button>
      </div>
      {statsMode==="combined" && <p style={{ fontSize:"12px", color:"#888", marginTop:"4px" }}>9-hole rounds have been doubled to estimate 18-hole equivalents.</p>}

      {/* Key Stats */}
      <div style={{ display:"flex", gap:"20px", flexWrap:"wrap", marginTop:"20px" }}>
        {[
          ["Total Rounds", filteredRounds.length],
          ["Best Score", filteredRounds.length ? Math.min(...filteredRounds.map(r => r.score)) : null],
          ["Worst Score", filteredRounds.length ? Math.max(...filteredRounds.map(r => r.score)) : null],
          ["Average Score", filteredRounds.length ? filteredRounds.reduce((sum,r)=>sum+r.score,0)/filteredRounds.length : null],
          ["FIR %", FIR_avg_tab],
          ["GIR %", GIR_avg_tab],
          ["Putts Per Round", avgPutts_tab],
          ["Penalties Per Round", avgPenalties_tab]
        ].map(([label, value]) => (
          <div style={cardStyle} key={label}>
            <h3>{label}</h3>
            <p>{label.includes("%") ? formatPercent(value) : formatNumber(value)}</p>
          </div>
        ))}
      </div>

      {/* Last 5 rounds table */}
      <div style={{ marginTop:"30px", background:"#fff", padding:"20px", borderRadius:"8px", boxShadow:"0 2px 10px rgba(0,0,0,0.05)" }}>
        <h3>Last 5 Rounds</h3>
        {filteredRounds.length===0 ? <p>No rounds played yet.</p> :
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>{["Date","Score","FIR %","GIR %","Putts","Penalties"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filteredRounds.map(r => (
                <tr key={r.id}>
                  <td style={tdStyle}>{formatDate(r.date)}</td>
                  <td style={tdStyle}>{formatNumber(r.score)}</td>
                  <td style={tdStyle}>{r.FIR_hit!==null && r.FIR_total!==null ? formatPercent((r.FIR_hit/r.FIR_total)*100) : "-"}</td>
                  <td style={tdStyle}>{r.GIR_hit!==null && r.GIR_total!==null ? formatPercent((r.GIR_hit/r.GIR_total)*100) : "-"}</td>
                  <td style={tdStyle}>{formatNumber(r.putts)}</td>
                  <td style={tdStyle}>{formatNumber(r.penalties)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </div>

      {/* Trends */}
      <div style={{ marginTop:"30px", display:"flex", gap:"20px", flexWrap:"wrap" }}>
        <div style={{ flex:"1 1 400px", background:"#fff", padding:"20px", borderRadius:"8px", boxShadow:"0 2px 10px rgba(0,0,0,0.05)" }}>
          <h3>Score Trend (Last 5 Rounds)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatDate} />
              <YAxis />
              <Tooltip labelFormatter={formatDate} formatter={val => formatNumber(val)} />
              <Legend />
              <Line type="monotone" dataKey="score" name="Score" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ flex:"1 1 400px", background:"#fff", padding:"20px", borderRadius:"8px", boxShadow:"0 2px 10px rgba(0,0,0,0.05)", position:"relative" }}>
          <h3>FIR/GIR % Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatDate} />
              <YAxis type="number" domain={[0,100]} allowDataOverflow={false} />
              <Tooltip labelFormatter={formatDate} formatter={val => (val!==null ? formatPercent(val) : "-")} />
              <Legend />
              <Line type="monotone" dataKey="FIR_pct" name="FIR %" stroke="#8884d8" dot={{r:4}} isAnimationActive={false} connectNulls />
              <Line type="monotone" dataKey="GIR_pct" name="GIR %" stroke="#82ca9d" dot={{r:4}} isAnimationActive={false} connectNulls />
              {!hasFirGirData && (
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="#888" fontSize={14}>
                  No data yet
                </text>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
