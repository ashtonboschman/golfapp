// client/src/pages/RoundForm.jsx
import { useEffect, useState, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function RoundForm({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const token = auth?.token;

  const [round, setRound] = useState({
    date: "",
    course_id: "",
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

  // Redirect if not logged in
  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  // Fetch courses for dropdown
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

  // Fetch round for edit
  useEffect(() => {
    if (mode === "edit" && id) fetchRound();
  }, [id, mode]);

  const fetchRound = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/api/rounds/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRound({
        date: data.date.split("T")[0] || "",
        course_id: data.course_id || "",
        score: data.score || "",
        notes: data.notes || "",
        FIR_hit: data.FIR_hit || null,
        GIR_hit: data.GIR_hit || null,
        putts: data.putts || null,
        penalties: data.penalties || null,
      });
    } catch (err) {
      console.error("Fetch round error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setRound((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    // Basic validation
    if (!round.date || !round.course_id || round.score === "") {
      setMessage("❌ Date, Course, and Score are required.");
      return;
    }

    if (round.score <= 0) {
      setMessage("❌ Score must be a positive number.");
      return;
    }

    // Find selected course for validation
    const selectedCourse = courses.find(c => c.id === Number(round.course_id));
    if (!selectedCourse) {
      setMessage("❌ Selected course is invalid.");
      return;
    }

    if (round.FIR_hit !== "" && (round.FIR_hit < 0 || round.FIR_hit > (selectedCourse.FIR_possible ?? selectedCourse.holes))) {
      setMessage(`❌ FIR Hit must be between 0 and ${selectedCourse.FIR_possible ?? selectedCourse.holes}.`);
      return;
    }

    if (round.GIR_hit !== "" && (round.GIR_hit < 0 || round.GIR_hit > selectedCourse.holes)) {
      setMessage(`❌ GIR Hit must be between 0 and ${selectedCourse.holes}.`);
      return;
    }

    if (round.putts !== "" && round.putts < 0) {
      setMessage("❌ Putts must be a positive number.");
      return;
    }

    if (round.penalties !== "" && round.penalties < 0) {
      setMessage("❌ Penalties must be a positive number.");
      return;
    }

    // Submit
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
      setTimeout(() => navigate("/rounds"), 1000);
    } catch (err) {
      console.error("Save round error:", err);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "40px", maxWidth: "600px", margin: "auto" }}>
      <h2>{mode === "add" ? "Add Round" : "Edit Round"}</h2>
      {message && <p style={{ color: message.startsWith("❌") ? "red" : "green" }}>{message}</p>}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <label>
          Date:
          <input type="date" name="date" value={round.date} onChange={handleChange} required />
        </label>

        <label>
          Course:
          <select name="course_id" value={round.course_id} onChange={handleChange} required>
            <option value="">-- Select Course --</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Score:
          <input type="number" name="score" value={round.score} onChange={handleChange} min="1" required />
        </label>

        <label>
          Notes:
          <textarea name="notes" value={round.notes} onChange={handleChange} rows={3} />
        </label>

        {/* Advanced Stats Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{ backgroundColor: "#3498db", color: "#fff", padding: "6px 12px", border: "none", borderRadius: "4px", cursor: "pointer", marginTop: "8px" }}
        >
          {showAdvanced ? "Hide Advanced Stats" : "Show Advanced Stats"}
        </button>

        {showAdvanced && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px", padding: "10px", border: "1px solid #ccc", borderRadius: "6px" }}>
            <label>
              FIR Hit:
              <input
                type="number"
                name="FIR_hit"
                value={round.FIR_hit}
                onChange={handleChange}
                min="0"
                max={courses.find(c => c.id === Number(round.course_id))?.FIR_possible ?? 18}
              />
            </label>

            <label>
              GIR Hit:
              <input
                type="number"
                name="GIR_hit"
                value={round.GIR_hit}
                onChange={handleChange}
                min="0"
                max={courses.find(c => c.id === Number(round.course_id))?.holes ?? 18}
              />
            </label>

            <label>
              Putts:
              <input
                type="number"
                name="putts"
                value={round.putts}
                onChange={handleChange}
                min="0"
              />
            </label>

            <label>
              Penalties:
              <input
                type="number"
                name="penalties"
                value={round.penalties}
                onChange={handleChange}
                min="0"
              />
            </label>
          </div>
        )}

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="submit"
            disabled={loading}
            style={{ padding: "8px 16px", backgroundColor: "#2ecc71", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
          >
            {loading ? (mode === "add" ? "Adding..." : "Updating...") : (mode === "add" ? "Add Round" : "Update Round")}
          </button>
          <button
            type="button"
            onClick={() => navigate("/rounds")}
            style={{ padding: "8px 16px", backgroundColor: "#e74c3c", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
