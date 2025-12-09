import { useEffect, useState, useContext } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "../css/RoundForm.css";

export default function RoundForm({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const origin = location.state?.from || "/rounds";
  const { auth } = useContext(AuthContext);
  const token = auth?.token;

  const [round, setRound] = useState({
    date: new Date().toISOString().split("T")[0],
    course_id: "",
    tee_id: "",
    hole_by_hole: 0,
    score: null,
    notes: "",
    fir_hit: null,
    gir_hit: null,
    putts: null,
    penalties: null,
    round_holes: [],
    advanced_stats: 0,
  });

  const [courses, setCourses] = useState([]);
  const [tees, setTees] = useState([]);
  const [holes, setHoles] = useState([]);
  const [holeScores, setHoleScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [initialized, setInitialized] = useState(false);

  // ────────────────────────────
  // Helpers
  // ────────────────────────────
  const isHBH = round.hole_by_hole === 1;
  const hasAdvanced = round.advanced_stats === 1;

  const sanitizeNumeric = (val) => val.replace(/\D/g, "");

  const getTotalScore = (holes) =>
    holes.reduce((sum, h) => sum + (h.score ?? 0), 0);

  const buildPayload = () => {
    const payload = {
      ...round,
      course_id: Number(round.course_id),
      tee_id: Number(round.tee_id),
    };

    if (isHBH) {
      payload.round_holes = holeScores.map((h) => ({
        hole_id: h.hole_id,
        score: h.score,
        fir_hit: hasAdvanced ? h.fir_hit : null,
        gir_hit: hasAdvanced ? h.gir_hit : null,
        putts: hasAdvanced ? h.putts : null,
        penalties: hasAdvanced ? h.penalties : null,
      }));

      payload.score = getTotalScore(holeScores);

      if (hasAdvanced) {
        ["fir_hit", "gir_hit", "putts", "penalties"].forEach(
          (f) =>
            (payload[f] = holeScores.reduce((s, h) => s + (h[f] ?? 0), 0))
        );
      }
    } else if (hasAdvanced) {
      ["fir_hit", "gir_hit", "putts", "penalties"].forEach(
        (f) => (payload[f] = round[f])
      );
    }

    return payload;
  };

  // ────────────────────────────
  // Binary toggle for FIR/GIR
  // ────────────────────────────
  const BinaryNullToggle = ({ value, onChange, disabled = false }) => {
    const handleClick = (val) => {
      if (!disabled) onChange(value === val ? null : val);
    };
    return (
      <div className="binary-null-toggle">
        <button
          className={value === 0 ? "active-red" : ""}
          onClick={() => handleClick(0)}
          disabled={disabled}
        >
          X
        </button>
        <button
          className={value === 1 ? "active-green" : ""}
          onClick={() => handleClick(1)}
          disabled={disabled}
        >
          ✓
        </button>
      </div>
    );
  };

  // ────────────────────────────
  // Fetchers
  // ────────────────────────────
  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  const fetchCourses = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/courses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourses(await res.json());
    } catch (err) {
      console.error(err);
      setMessage("Error fetching courses.");
    }
  };

  const fetchTees = async (courseId) => {
    try {
      const res = await fetch(
        `http://localhost:3000/api/tees?course_id=${courseId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTees(await res.json());
    } catch (err) {
      console.error(err);
      setMessage("Error fetching tees.");
    }
  };

  const fetchHoles = async (
    teeId,
    existingRoundHoles = [],
    isHoleByHole = 0
  ) => {
    if (!teeId) return;
    try {
      const res = await fetch(`http://localhost:3000/api/tees/${teeId}/holes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setHoles(data || []);

      const initScores = (data || []).map((hole) => {
        const existing = existingRoundHoles.find((h) => h.hole_id === hole.id);
        return {
          hole_id: hole.id,
          hole_number: hole.hole_number,
          par: hole.par,
          score: existing?.score ?? null,
          fir_hit: existing?.fir_hit ?? null,
          gir_hit: existing?.gir_hit ?? null,
          putts: existing?.putts ?? null,
          penalties: existing?.penalties ?? null,
        };
      });

      setHoleScores(initScores);
    } catch (err) {
      console.error(err);
      setMessage("Error fetching holes.");
    }
  };

  useEffect(() => {
    if (token) fetchCourses();
  }, [token]);

  useEffect(() => {
    if (round.course_id) fetchTees(round.course_id);
  }, [round.course_id]);

  useEffect(() => {
    if (mode !== "edit" || !id || !token) return;

    const fetchRound = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:3000/api/rounds/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const roundData = {
          date: data.date?.split("T")[0] ?? new Date().toISOString().split("T")[0],
          course_id: data.course_id?.toString() ?? "",
          tee_id: data.tee_id?.toString() ?? "",
          hole_by_hole: data.hole_by_hole === 1 ? 1 : 0,
          score: data.score ?? null,
          notes: data.notes ?? "",
          fir_hit: data.fir_hit ?? null,
          gir_hit: data.gir_hit ?? null,
          putts: data.putts ?? null,
          penalties: data.penalties ?? null,
          round_holes: data.round_holes || [],
          advanced_stats: data.advanced_stats === 1 ? 1 : 0,
        };
        setRound(roundData);

        if (data.tee_id) {
          await fetchHoles(data.tee_id, data.round_holes || [], roundData.hole_by_hole);
        }

        setInitialized(true);
      } catch (err) {
        console.error(err);
        setMessage("Error fetching round.");
      } finally {
        setLoading(false);
      }
    };

    fetchRound();
  }, [id, mode, token]);

  // ────────────────────────────
  // Handlers
  // ────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (["score", "fir_hit", "gir_hit", "putts", "penalties"].includes(name)) {
      const numericValue = sanitizeNumeric(value);
      setRound((prev) => ({
        ...prev,
        [name]: numericValue === "" ? null : Number(numericValue),
      }));
    } else {
      setRound((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleHoleScoreChange = (index, field, value) => {
    setHoleScores((prev) =>
      prev.map((h, i) =>
        i !== index
          ? h
          : {
              ...h,
              [field]:
                (field === "fir_hit" || field === "gir_hit") && isHBH
                  ? value
                  : sanitizeNumeric(value) === ""
                  ? null
                  : Number(sanitizeNumeric(value)),
            }
      )
    );
  };

  const toggleHoleByHole = () => {
    setRound((prev) => {
      const newHBH = prev.hole_by_hole === 1 ? 0 : 1;
      if (newHBH === 1) {
        const fresh = holes.map((h) => {
          const existing = holeScores.find((hs) => hs.hole_id === h.id);
          return {
            hole_id: h.id,
            hole_number: h.hole_number,
            par: h.par,
            score: existing?.score ?? null,
            fir_hit: existing?.fir_hit ?? null,
            gir_hit: existing?.gir_hit ?? null,
            putts: existing?.putts ?? null,
            penalties: existing?.penalties ?? null,
          };
        });
        setHoleScores(fresh);
        return { ...prev, hole_by_hole: 1, score: null };
      }
      const sumScore = getTotalScore(holeScores);
      return { ...prev, hole_by_hole: 0, score: sumScore };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!round.date || !round.course_id || !round.tee_id) {
      setMessage("❌ Date, Course, and Tee are required.");
      return;
    }

    if (!isHBH && (round.score === null || round.score === "")) {
      setMessage("❌ Score is required in Quick Score mode.");
      return;
    }

    if (isHBH) {
      const incomplete = holeScores.find((h) => h.score === null);
      if (incomplete) {
        setMessage(`❌ Please enter a score for hole ${incomplete.hole_number}.`);
        return;
      }
    }

    setLoading(true);
    try {
      const url =
        mode === "add"
          ? "http://localhost:3000/api/rounds"
          : `http://localhost:3000/api/rounds/${id}`;
      const method = mode === "add" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildPayload()),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error saving round");

      setMessage(data.message || "✅ Round saved successfully!");
      setTimeout(() => navigate(origin), 1000);
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Error saving round");
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────
  // Render helpers
  // ────────────────────────────
  const formatValue = (val) => (val === null ? "" : val);

  const calculateTotals = () => {
    const totals = { score: 0, par: 0, fir_hit: 0, gir_hit: 0, putts: 0, penalties: 0 };
    let hasScore = false;
    holeScores.forEach((h) => {
      if (h.score !== null) {
        totals.score += h.score;
        hasScore = true;
      }
      if (h.par !== null) totals.par += h.par;
      if (hasAdvanced) {
        ["fir_hit", "gir_hit", "putts", "penalties"].forEach((f) => {
          if (h[f] !== null) totals[f] += h[f];
        });
      }
    });
    return {
      score: hasScore ? totals.score : null,
      par: totals.par || null,
      fir_hit: totals.fir_hit || null,
      gir_hit: totals.gir_hit || null,
      putts: totals.putts || null,
      penalties: totals.penalties || null,
    };
  };

  const renderHoleTable = () => {
    if (!isHBH || !initialized) return null;
    const totals = calculateTotals();
    const show = (v) => (v === null ? "–" : v);

    return (
      <div className="hole-table-wrapper">
        <table className="hole-table">
          <thead>
            <tr>
              <th>Hole #</th>
              <th>Par</th>
              <th>Score</th>
              {hasAdvanced && <th>FIR</th>}
              {hasAdvanced && <th>GIR</th>}
              {hasAdvanced && <th>Putts</th>}
              {hasAdvanced && <th>Penalties</th>}
            </tr>
          </thead>
          <tbody>
            {holeScores.map((h, idx) => (
              <tr key={h.hole_id}>
                <td>{h.hole_number}</td>
                <td>{h.par}</td>
                <td>
                  <input
                    type="text"
                    pattern="[0-9]*"
                    value={formatValue(h.score)}
                    onChange={(e) => handleHoleScoreChange(idx, "score", e.target.value)}
                  />
                </td>
                {hasAdvanced && (
                  <>
                    <td>
                      <BinaryNullToggle
                        value={h.fir_hit}
                        onChange={(val) => handleHoleScoreChange(idx, "fir_hit", val)}
                        disabled={h.par === 3}
                      />
                    </td>
                    <td>
                      <BinaryNullToggle
                        value={h.gir_hit}
                        onChange={(val) => handleHoleScoreChange(idx, "gir_hit", val)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        pattern="[0-9]*"
                        value={formatValue(h.putts)}
                        onChange={(e) => handleHoleScoreChange(idx, "putts", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        pattern="[0-9]*"
                        value={formatValue(h.penalties)}
                        onChange={(e) => handleHoleScoreChange(idx, "penalties", e.target.value)}
                      />
                    </td>
                  </>
                )}
              </tr>
            ))}
            {holeScores.length > 0 && (
              <tr className="total-row">
                <td>Total</td>
                <td>{show(totals.par)}</td>
                <td>{show(totals.score)}</td>
                {hasAdvanced && <td>{show(totals.fir_hit)}</td>}
                {hasAdvanced && <td>{show(totals.gir_hit)}</td>}
                {hasAdvanced && <td>{show(totals.putts)}</td>}
                {hasAdvanced && <td>{show(totals.penalties)}</td>}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const groupedTees = tees.reduce((acc, tee) => {
    const genderKey = tee.gender.charAt(0).toUpperCase() + tee.gender.slice(1).toLowerCase();
    if (!acc[genderKey]) acc[genderKey] = [];
    acc[genderKey].push(tee);
    return acc;
  }, {});

  // ────────────────────────────
  // Render
  // ────────────────────────────
  return (
    <div className="round-form-page">
      <h2>{mode === "add" ? "Add Round" : "Edit Round"}</h2>

      {message && (
        <p className={`round-form-message ${message.startsWith("❌") ? "error" : "success"}`}>
          {message}
        </p>
      )}

      <form onSubmit={handleSubmit} className="round-form">
        <div className="form-field">
          <label>Date</label>
          <input type="date" name="date" value={round.date} onChange={handleChange} required />
        </div>

        <div className="form-field">
          <label>Course</label>
          <select name="course_id" value={round.course_id} onChange={handleChange} required>
            <option value="">-- Select Course --</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.course_name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label>Tee</label>
          <select
            name="tee_id"
            value={round.tee_id}
            onChange={handleChange}
            required
            disabled={!round.course_id}
          >
            <option value="">-- Select Tee --</option>
            {Object.entries(groupedTees).map(([gender, teesGroup]) => (
              <optgroup key={gender} label={gender}>
                {teesGroup.map((t) => (
                  <option key={t.id} value={t.id}>
                    {`${t.tee_name} ${t.total_yards ?? 0} yds (${t.course_rating ?? 0}/${t.slope_rating ?? 0})`}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {initialized && (
          <>
            <button type="button" className="toggle-btn" onClick={toggleHoleByHole}>
              {isHBH ? "Switch to Quick Score Mode" : "Switch to Hole-by-Hole Mode"}
            </button>

            <button
              type="button"
              className="toggle-btn"
              onClick={() =>
                setRound((prev) => ({ ...prev, advanced_stats: hasAdvanced ? 0 : 1 }))
              }
            >
              {hasAdvanced ? "Remove Advanced Stats" : "Add Advanced Stats"}
            </button>
          </>
        )}

        {!isHBH && (
          <div className="form-field">
            <label>Score</label>
            <input
              type="text"
              pattern="[0-9]*"
              name="score"
              value={formatValue(round.score)}
              onChange={handleChange}
              required
            />
          </div>
        )}

        {!isHBH && hasAdvanced && (
          <div className="advanced-stats">
            {["fir_hit", "gir_hit", "putts", "penalties"].map((field) => (
              <div key={field} className="form-field">
                <label>{field.toUpperCase()}</label>
                <input
                  type="text"
                  pattern="[0-9]*"
                  name={field}
                  value={formatValue(round[field])}
                  onChange={handleChange}
                />
              </div>
            ))}
          </div>
        )}

        {renderHoleTable()}

        <div className="form-field">
          <label>Notes</label>
          <textarea name="notes" value={round.notes} onChange={handleChange} rows={3} />
        </div>

        <div className="form-buttons">
          <button type="button" onClick={() => navigate(origin)} className="cancel-btn">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="save-btn">
            {loading ? (mode === "add" ? "Adding..." : "Updating...") : mode === "add" ? "Add Round" : "Update Round"}
          </button>
        </div>
      </form>
    </div>
  );
}