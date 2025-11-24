import React, { useEffect, useState, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "../css/CourseForm.css";

export default function CourseForm({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const token = auth?.token;

  const [course, setCourse] = useState({
    name: "",
    tee_id: "",
    city: "",
    holes: 18,
    par: "",
    slope: "",
    rating: "",
    FIR_possible: 0,
  });
  const [tees, setTees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  useEffect(() => {
    if (!token) return;
    const fetchTees = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/tees", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Error fetching tees");
        setTees(data.sort((a, b) => a.id - b.id));
      } catch (err) {
        console.error("Fetch tees error:", err);
      }
    };
    fetchTees();
  }, [token]);

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
        tee_id: data.tee_id || "",
        city: data.city || "",
        holes: data.holes || 18,
        par: data.par || "",
        slope: data.slope || "",
        rating: data.rating || "",
        FIR_possible: data.FIR_possible ?? 0,
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
    setCourse((prev) => ({
      ...prev,
      [name]: ["holes","par","slope","rating","FIR_possible"].includes(name) ? Number(value) : value
    }));
  };

  const validateCourse = () => {
    if (!course.name.trim()) return "❌ Name is required";
    if (!course.tee_id) return "❌ Tee is required";
    if (!course.city.trim()) return "❌ City is required";
    if (![9,18].includes(course.holes)) return "❌ Holes must be 9 or 18";
    if (!course.par || course.par < 1) return "❌ Par must be positive";
    if (!course.slope || course.slope < 1) return "❌ Slope must be positive";
    if (!course.rating || course.rating < 1) return "❌ Rating must be positive";
    if (course.FIR_possible < 0 || course.FIR_possible > course.holes) return `❌ FIR_possible must be between 0 and ${course.holes}`;
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    const error = validateCourse();
    if (error) return setMessage(error);

    setLoading(true);
    try {
      const url = mode === "add" ? "http://localhost:3000/api/courses" : `http://localhost:3000/api/courses/${id}`;
      const method = mode === "add" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
    <div className="course-form-page">
      <h2>{mode === "add" ? "Add Course" : "Edit Course"}</h2>

      {message && (
        <p className={`course-form-message ${message.startsWith("❌") ? "error" : "success"}`}>
          {message}
        </p>
      )}

      <form className="course-form" onSubmit={handleSubmit}>
        <label>Name</label>
        <input type="text" name="name" value={course.name} onChange={handleChange} required />

        <label>Tee</label>
        <select name="tee_id" value={course.tee_id} onChange={handleChange} required>
          <option value="">-- Select Tee --</option>
          {tees.map((tee) => (
            <option key={tee.id} value={tee.id}>{tee.name}</option>
          ))}
        </select>

        <label>City</label>
        <input type="text" name="city" value={course.city} onChange={handleChange} />

        <label>Holes</label>
        <select name="holes" value={course.holes} onChange={handleChange}>
          {[9,18].map(h => <option key={h} value={h}>{h}</option>)}
        </select>

        {["par","slope","rating","FIR_possible"].map(field => (
          <div key={field}>
            <label>{field === "FIR_possible" ? "FIR Possible" : field.charAt(0).toUpperCase()+field.slice(1)}</label>
            <input type="number" name={field} value={course[field]} min={field==="FIR_possible"?0:1} max={field==="FIR_possible"?course.holes:undefined} onChange={handleChange}/>
          </div>
        ))}

        <div className="course-form-buttons">
          <button type="submit" disabled={loading} className="course-form-button save">
            {loading ? (mode==="add"?"Adding...":"Updating...") : (mode==="add"?"Add Course":"Update Course")}
          </button>
          <button type="button" onClick={()=>navigate("/courses")} className="course-form-button cancel">Cancel</button>
        </div>
      </form>
    </div>
  );
}
