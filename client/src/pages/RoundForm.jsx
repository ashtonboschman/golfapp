// client/src/pages/RoundForm.jsx
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
    date: "",
    course_name: "",
    course_id: "",
    course_tee: "",
    score: "",
    notes: "",
    FIR_hit: null,
    GIR_hit: null,
    putts: null,
    penalties: null,
  });

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  useEffect(() => {
    if (token) fetchCourses();
  }, [token]);

  const fetchCourses = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/courses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCourses(data);
    } catch (err) {
      console.error("Fetch courses error:", err);
    }
  };

  useEffect(() => {
    if (mode === "edit" && id && courses.length > 0) fetchRound();
  }, [id, mode, courses]);

  const fetchRound = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/api/rounds/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const course = courses.find(c => c.id === data.course_id);

      setRound({
        date: data.date?.split("T")[0] || "",
        course_name: course?.name || "",
        course_id: data.course_id?.toString() || "",
        course_tee: data.course_tee?.toString() || "",
        score: data.score ?? "",
        notes: data.notes ?? "",
        FIR_hit: data.FIR_hit ?? null,
        GIR_hit: data.GIR_hit ?? null,
        putts: data.putts ?? null,
        penalties: data.penalties ?? null,
      });
    } catch (err) {
      console.error("Fetch round error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "course_name") {
      setRound(prev => ({ ...prev, course_name: value, course_tee: "", course_id: "" }));
    } else if (name === "course_tee") {
      const selectedTee = courses.find(
        c => c.name === round.course_name && c.tee_id.toString() === value
      );
      setRound(prev => ({
        ...prev,
        course_tee: value,
        course_id: selectedTee ? selectedTee.id.toString() : "",
      }));
    } else if (["score", "FIR_hit", "GIR_hit", "putts", "penalties"].includes(name)) {
      setRound(prev => ({ ...prev, [name]: value === "" ? "" : Number(value) }));
    } else {
      setRound(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!round.date || !round.course_id || round.score === "") {
      setMessage("❌ Date, Course, and Score are required.");
      return;
    }

    const selectedCourse = courses.find(c => c.id === Number(round.course_id));
    if (!selectedCourse) {
      setMessage("❌ Selected course is invalid.");
      return;
    }

    if (
      round.FIR_hit !== "" &&
      (round.FIR_hit < 0 || round.FIR_hit > (selectedCourse.FIR_possible ?? selectedCourse.holes))
    ) {
      setMessage(`❌ FIR Hit must be between 0 and ${selectedCourse.FIR_possible ?? selectedCourse.holes}.`);
      return;
    }

    if (round.GIR_hit !== "" && (round.GIR_hit < 0 || round.GIR_hit > selectedCourse.holes)) {
      setMessage(`❌ GIR Hit must be between 0 and ${selectedCourse.holes}.`);
      return;
    }

    setLoading(true);
    try {
      const url = mode === "add" ? "http://localhost:3000/api/rounds" : `http://localhost:3000/api/rounds/${id}`;
      const method = mode === "add" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(round),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error saving round");

      setMessage(data.message || "✅ Round saved successfully!");
      setTimeout(() => navigate(origin), 1000);
    } catch (err) {
      console.error("Save round error:", err);
      setMessage(err.message || "Error saving round");
    } finally {
      setLoading(false);
    }
  };

  const formatValue = val => (val !== null && val !== undefined ? val : "");

  const uniqueCourses = Array.from(new Map(courses.map(c => [c.name, c])).values());
  const courseTees = courses
    .filter(c => c.name === round.course_name)
    .sort((a, b) => a.tee_id - b.tee_id); // sorted by tee_id

  return (
    <div className="round-form-page">
      <h2>{mode === "add" ? "Add Round" : "Edit Round"}</h2>

      {message && <p className={`round-form-message ${message.startsWith("❌") ? "error" : "success"}`}>{message}</p>}

      <form onSubmit={handleSubmit} className="round-form">
        <label>Date</label>
        <input type="date" name="date" value={round.date} onChange={handleChange} required />

        <label>Course</label>
        <select name="course_name" value={round.course_name} onChange={handleChange} required>
          <option value="">-- Select Course --</option>
          {uniqueCourses.map(c => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>

        <label>Tee</label>
        <select name="course_tee" value={round.course_tee} onChange={handleChange} required disabled={!round.course_name}>
          <option value="">-- Select Tee --</option>
          {courseTees.map(c => (
            <option key={c.tee_id} value={c.tee_id}>
              {c.tee?.name ?? c.tee_name ?? "Unnamed Tee"}
            </option>
          ))}
        </select>

        <label>Score</label>
        <input type="number" name="score" value={round.score} onChange={handleChange} min="1" required />

        <label>Notes</label>
        <textarea name="notes" value={round.notes} onChange={handleChange} rows={3} />

        <button type="button" className="toggle-btn" onClick={() => setShowAdvanced(!showAdvanced)}>
          {showAdvanced ? "Hide Advanced Stats" : "Show Advanced Stats"}
        </button>

        {showAdvanced && (
          <div className="advanced-stats">
            <label>FIR Hit</label>
            <input type="number" name="FIR_hit" value={formatValue(round.FIR_hit)} onChange={handleChange} min="0" max={courses.find(c => c.id === Number(round.course_id))?.FIR_possible ?? 18} />

            <label>GIR Hit</label>
            <input type="number" name="GIR_hit" value={formatValue(round.GIR_hit)} onChange={handleChange} min="0" max={courses.find(c => c.id === Number(round.course_id))?.holes ?? 18} />

            <label>Putts</label>
            <input type="number" name="putts" value={formatValue(round.putts)} onChange={handleChange} min="0" />

            <label>Penalties</label>
            <input type="number" name="penalties" value={formatValue(round.penalties)} onChange={handleChange} min="0" />
          </div>
        )}

        <div className="form-buttons">
          <button type="submit" disabled={loading} className="save-btn">
            {loading ? (mode === "add" ? "Adding..." : "Updating...") : (mode === "add" ? "Add Round" : "Update Round")}
          </button>
          <button type="button" onClick={() => navigate(origin)} className="cancel-btn">Cancel</button>
        </div>
      </form>
    </div>
  );
}