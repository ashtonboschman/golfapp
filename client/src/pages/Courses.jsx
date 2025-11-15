import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Courses() {
  const { auth, logout } = useContext(AuthContext);
  const token = auth?.token;
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  // Redirect to login if not logged in
  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  // Fetch courses whenever token is available
  useEffect(() => {
    if (token) fetchCourses();
  }, [token]);

  const fetchCourses = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("http://localhost:3000/api/courses", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || "Error fetching courses");
      }

      const data = await res.json();
      setCourses(data);
      if (data.length === 0) setMessage("No courses found. Add your first course!");
    } catch (err) {
      console.error("Fetch courses error:", err);
      setMessage(err.message || "Error fetching courses");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (courseId) => {
    if (!window.confirm("Are you sure you want to delete this course?")) return;

    try {
      const res = await fetch(`http://localhost:3000/api/courses/${courseId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error deleting course");

      setMessage(data.message || "✅ Course deleted!");
      // Remove deleted course from state
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
    } catch (err) {
      console.error("Delete course error:", err);
      setMessage(err.message);
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <h2>Courses</h2>

      {message && (
        <p style={{ color: message.includes("Error") ? "red" : "green" }}>{message}</p>
      )}

      <button onClick={() => navigate("/courses/add")} style={addBtnStyle}>
        + Add Course
      </button>

      {loading ? (
        <p>Loading courses...</p>
      ) : courses.length === 0 ? (
        <p>No courses available. Please add a course.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>City</th>
              <th style={thStyle}>Holes</th>
              <th style={thStyle}>Par</th>
              <th style={thStyle}>Rating</th>
              <th style={thStyle}>Slope</th>
              <th style={thStyle}>FIR Possible</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id}>
                <td style={tdStyle}>{course.name}</td>
                <td style={tdStyle}>{course.city || "-"}</td>
                <td style={tdStyle}>{course.holes}</td>
                <td style={tdStyle}>{course.par || "-"}</td>
                <td style={tdStyle}>{course.rating || "-"}</td>
                <td style={tdStyle}>{course.slope || "-"}</td>
                <td style={tdStyle}>{course.FIR_possible || "-"}</td>
                <td style={tdStyle}>
                  <button
                    onClick={() => navigate(`/courses/edit/${course.id}`)}
                    style={editBtnStyle}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(course.id)}
                    style={deleteBtnStyle}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Styles
const thStyle = { borderBottom: "1px solid #ccc", padding: "8px", textAlign: "left" };
const tdStyle = { borderBottom: "1px solid #eee", padding: "8px" };
const addBtnStyle = {
  marginBottom: "20px",
  backgroundColor: "#2ecc71",
  color: "#fff",
  border: "none",
  padding: "10px 16px",
  borderRadius: "4px",
  cursor: "pointer",
};
const editBtnStyle = {
  backgroundColor: "#3498db",
  color: "#fff",
  border: "none",
  padding: "5px 10px",
  borderRadius: "4px",
  cursor: "pointer",
  marginRight: "6px",
};
const deleteBtnStyle = {
  backgroundColor: "#e74c3c",
  color: "#fff",
  border: "none",
  padding: "5px 10px",
  borderRadius: "4px",
  cursor: "pointer",
};
