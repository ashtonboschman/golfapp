import { useContext, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import CourseCard from "../components/CourseCard";
import "../css/Courses.css";

export default function Courses() {
  const { auth, logout } = useContext(AuthContext);
  const token = auth?.token;
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const BASE_URL = "http://localhost:3000";

  // Redirect if not logged in
  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  // Fetch courses
  useEffect(() => {
    if (token) fetchCourses();
  }, [token]);

  const fetchCourses = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${BASE_URL}/api/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) return handleUnauthorized();

      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid data received from server");

      setCourses(data);
      if (data.length === 0) setMessage("No courses found. Add your first course!");
    } catch (err) {
      console.error("Fetch error:", err);
      setMessage(err.message || "Error fetching courses");
    } finally {
      setLoading(false);
    }
  };

  const handleUnauthorized = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleDelete = useCallback(
    async (courseId) => {
      if (!window.confirm("Are you sure you want to delete this course?")) return;

      try {
        const res = await fetch(`${BASE_URL}/api/courses/${courseId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Error deleting course");

        setMessage(data.message || "✅ Course deleted!");
        setCourses((prev) => prev.filter((c) => c.id !== courseId));
      } catch (err) {
        console.error("Delete course error:", err);
        setMessage(err.message || "Error deleting course");
      }
    },
    [token]
  );

  return (
    <div className="courses-page">
      <h2 className="courses-title">Courses</h2>

      {message && (
        <p className={`courses-message ${message.includes("Error") ? "error" : "success"}`}>
          {message}
        </p>
      )}

      <button
        className="courses-add-btn"
        onClick={() => navigate("/courses/add")}
      >
        + Add Course
      </button>

      {loading ? (
        <p>Loading courses...</p>
      ) : courses.length === 0 ? (
        <p>No courses available. Please add a course.</p>
      ) : (
        <div className="courses-grid">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onEdit={(id) => navigate(`/courses/edit/${id}`)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}