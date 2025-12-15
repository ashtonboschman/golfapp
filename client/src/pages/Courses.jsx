import { useContext, useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import CourseCard from "../components/CourseCard";

export default function Courses() {
  const { auth, logout } = useContext(AuthContext);
  const token = auth?.token;
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const observer = useRef();
  const BASE_URL = "http://localhost:3000";

  // Redirect if not logged in
  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  // Fetch courses
  const fetchCourses = async (pageToFetch) => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${BASE_URL}/api/courses?limit=20&page=${pageToFetch}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if ([401, 403].includes(res.status)) {
        logout();
        return navigate("/login", { replace: true });
      }

      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid data received from server");

      setCourses((prev) => {
        const map = new Map(prev.map((c) => [c.id, c]));
        data.forEach((c) => map.set(c.id, c));
        return Array.from(map.values());
      });

      setHasMore(data.length === 20);
      setPage(pageToFetch);
    } catch (err) {
      setMessage(err.message || "Error fetching courses");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (token) {
      setCourses([]);
      setFilteredCourses([]);
      setPage(1);
      setHasMore(true);
      fetchCourses(1);
    }
  }, [token]);

  // Filter courses by search
  useEffect(() => {
    if (!search.trim()) {
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

  // Infinite scroll
  const lastCourseRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) fetchCourses(page + 1);
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore, page]
  );

  return (
    <div className="page-stack">
      {message && (
        <p className={`courses-message ${message.includes("Error") ? "error" : "success"}`}>
          {message}
        </p>
      )}

      <input
        type="text"
        placeholder="Search Course"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="form-input"
      />

      {filteredCourses.length === 0 && !loading ? (
        <p>No courses match your search.</p>
      ) : (
        <div className="grid grid-1" style={{ gap: 16 }}>
          {filteredCourses.map((course, index) => {
            const isLast = index === filteredCourses.length - 1;
            return (
              <div key={course.id} ref={isLast ? lastCourseRef : null}>
                <CourseCard
                  course={course}
                  locations={course.location ? [course.location] : []}
                  tees={[...(course.tees.male || []), ...(course.tees.female || [])]}
                />
              </div>
            );
          })}
        </div>
      )}

      {loading && <p>Loading courses...</p>}
    </div>
  );
}