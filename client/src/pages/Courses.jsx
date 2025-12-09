import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import CourseCard from "../components/CourseCard";
import "../css/Courses.css";

export default function Courses() {
  const { auth, logout } = useContext(AuthContext);
  const token = auth?.token;
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const BASE_URL = "http://localhost:3000";

  // Redirect if not logged in
  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  // Fetch courses
  useEffect(() => {
    if (token) fetchCourses();
  }, [token]);

  // Filter courses based on search
  useEffect(() => {
    if (search.trim() === "") {
      setFilteredCourses(courses);
    } else {
      const lower = search.toLowerCase();
      setFilteredCourses(
        courses.filter(
          (c) =>
            c.course_name.toLowerCase().includes(lower) ||
            (c.location?.city || "").toLowerCase().includes(lower)
        )
      );
    }
  }, [search, courses]);

  const fetchCourses = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${BASE_URL}/api/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        logout();
        return navigate("/login", { replace: true });
      }

      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid data received from server");

      setCourses(data);
      setFilteredCourses(data);

      if (data.length === 0) setMessage("No courses found.");
    } catch (err) {
      console.error("Fetch error:", err);
      setMessage(err.message || "Error fetching courses");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="courses-page">
      <h2 className="courses-title">Courses</h2>

      {message && (
        <p className={`courses-message ${message.includes("Error") ? "error" : "success"}`}>
          {message}
        </p>
      )}

      {/* Search bar */}
      <input
        type="text"
        placeholder="Search by Course or City..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="courses-search"
      />

      {loading ? (
        <p>Loading courses...</p>
      ) : filteredCourses.length === 0 ? (
        <p>No courses match your search.</p>
      ) : (
        <div className="courses-grid">
          {filteredCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              locations={course.location ? [course.location] : []}
              tees={[...(course.tees.male || []), ...(course.tees.female || [])]}
            />
          ))}
        </div>
      )}
    </div>
  );
}