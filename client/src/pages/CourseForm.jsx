// client/src/pages/CourseForm.jsx
import React, { useEffect, useState, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function CourseForm({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const token = auth?.token;

  const [course, setCourse] = useState({
    name: "",
    city: "",
    holes: 18,
    par: "",
    slope: "",
    rating: "",
    FIR_possible: 0,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  useEffect(() => {
    if (mode === "edit" && id) fetchCourse();
  }, [id, mode]);

  const fetchCourse = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`http://localhost:3000/api/courses/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error fetching course");

      setCourse({
        name: data.name || "",
        city: data.city || "",
        holes: data.holes || 18,
        par: data.par || "",
        slope: data.slope || "",
        rating: data.rating || "",
        FIR_possible: data.FIR_possible || 0,
      });
    } catch (err) {
      console.error("Fetch course error:", err);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (["holes", "FIR_possible", "par", "slope", "rating"].includes(name)) {
      const num = Number(value);
      if (!isNaN(num)) setCourse((prev) => ({ ...prev, [name]: num }));
    } else {
      setCourse((prev) => ({ ...prev, [name]: value }));
    }
  };

  const validateCourse = () => {
    if (!course.name.trim()) return "❌ Name is required";
    if (!course.city.trim()) return "❌ City is required";
    if (course.holes !== 9 && course.holes !== 18) return "❌ Holes must be 9 or 18";
    if (course.par === "" || course.par < 1) return "❌ Par is required and must be positive";
    if (course.slope === "" || course.slope < 1) return "❌ Slope is required and must be positive";
    if (course.rating === "" || course.rating < 1) return "❌ Rating is required and must be positive";
    if (course.FIR_possible < 0 || course.FIR_possible > course.holes)
      return `❌ FIR_possible must be between 0 and ${course.holes}`;
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    const validationError = validateCourse();
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setLoading(true);
    try {
      const url =
        mode === "add"
          ? "http://localhost:3000/api/courses"
          : `http://localhost:3000/api/courses/${id}`;
      const method = mode === "add" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(course),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error saving course");

      setMessage(data.message || "✅ Course saved successfully!");
      setTimeout(() => navigate("/courses"), 1000);
    } catch (err) {
      console.error("Save course error:", err);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "40px", maxWidth: "600px", margin: "auto" }}>
      <h2>{mode === "add" ? "Add Course" : "Edit Course"}</h2>
      {message && (
        <p style={{ color: message.startsWith("❌") ? "red" : "green" }}>{message}</p>
      )}

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "12px" }}
      >
        <label>
          Name:
          <input type="text" name="name" value={course.name} onChange={handleChange} required />
        </label>

        <label>
          City:
          <input type="text" name="city" value={course.city} onChange={handleChange} />
        </label>

        <label>
          Holes:
          <select name="holes" value={course.holes} onChange={handleChange}>
            <option value={9}>9</option>
            <option value={18}>18</option>
          </select>
        </label>

        <label>
          Par:
          <input type="number" name="par" value={course.par} onChange={handleChange} required />
        </label>

        <label>
          Slope:
          <input type="number" name="slope" value={course.slope} onChange={handleChange} required />
        </label>

        <label>
          Rating:
          <input type="number" name="rating" value={course.rating} onChange={handleChange} required />
        </label>

        <label>
          FIR Possible:
          <input
            type="number"
            name="FIR_possible"
            value={course.FIR_possible}
            onChange={handleChange}
            min={0}
            max={course.holes}
            required
          />
        </label>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "8px 16px",
              backgroundColor: "#2ecc71",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {loading ? (mode === "add" ? "Adding..." : "Updating...") : (mode === "add" ? "Add Course" : "Update Course")}
          </button>
          <button
            type="button"
            onClick={() => navigate("/courses")}
            style={{
              padding: "8px 16px",
              backgroundColor: "#e74c3c",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
