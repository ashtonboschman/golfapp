// client/src/pages/CourseDetails.jsx
import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function CourseDetails() {
  const { auth, logout } = useContext(AuthContext);
  const token = auth?.token;
  const navigate = useNavigate();
  const { id } = useParams();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedTeeId, setSelectedTeeId] = useState("");
  const [teesGrouped, setTeesGrouped] = useState({});

  const BASE_URL = "http://localhost:3000";

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  useEffect(() => {
    const fetchCourse = async () => {
      setLoading(true);
      setMessage("");
      try {
        const res = await fetch(`${BASE_URL}/api/courses/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if ([401, 403].includes(res.status)) {
          logout();
          return navigate("/login", { replace: true });
        }

        if (res.status === 404) {
          setMessage("Course not found");
          setCourse(null);
          return;
        }

        const data = await res.json();
        setCourse(data);

        const tees = [...(data.tees.male || []), ...(data.tees.female || [])];

        const grouped = tees.reduce((acc, tee) => {
          const g = tee.gender.charAt(0).toUpperCase() + tee.gender.slice(1);
          (acc[g] ||= []).push(tee);
          return acc;
        }, {});
        setTeesGrouped(grouped);

        if (data.tees.male?.length > 0) {
          const longest = data.tees.male.reduce((a, b) =>
            b.total_yards > a.total_yards ? b : a
          );
          setSelectedTeeId(String(longest.id));
        } else if (tees.length > 0) {
          setSelectedTeeId(String(tees[0].id));
        }
      } catch (err) {
        setMessage(err.message || "Error fetching course");
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchCourse();
  }, [id, token, logout, navigate]);

  if (loading) return <p>Loading course details...</p>;
  if (message)
    return (
      <p
        className={`courses-message ${
          message.includes("Error") ? "error" : "success"
        }`}
      >
        {message}
      </p>
    );
  if (!course) return null;

  const allTees = [...(course.tees.male || []), ...(course.tees.female || [])];
  const selectedTee = allTees.find((t) => Number(t.id) === Number(selectedTeeId));
  if (!selectedTee) return null;

  const holes = selectedTee.holes || [];
  const hasHandicap = holes.some((h) => h.handicap != null);

  const computeTotals = (list) =>
    list.reduce(
      (acc, h) => {
        acc.par += Number(h.par || 0);
        acc.yards += Number(h.yardage || 0);
        return acc;
      },
      { par: 0, yards: 0 }
    );

  const front9Totals = computeTotals(holes.slice(0, 9));
  const back9Totals = computeTotals(holes.slice(9, 18));
  const fullTotals = computeTotals(holes);

  return (
    <div className="page-stack">
      {/* Add Round Button */}
      <button
        className="btn btn-save"
        onClick={() =>
          navigate("/rounds/add", {
            state: {
              courseId: course.id,
              courseName: course.course_name,
              teeId: selectedTee.id,
              teeName: selectedTee.tee_name,
              from: "/courses/" + course.id
            },
          })
        }
      >
        + Add Round
      </button>

      {/* Course Info */}
      <div className="card coiurse-card">
        <h2 className="course-name">{course.course_name}</h2>
        <p className="course-club"><strong>Club:</strong> {course.club_name}</p>
        <p className="course-location">
          <strong>Location:</strong> {course.location.city}, {course.location.state}, {course.location.country}
        </p>
      </div>

      {/* Tee Selector */}
      <div className="card tee-select-card">
        <label htmlFor="tee-select"><strong>Select Tee:</strong></label>
        <select
          id="tee-select"
          className="form-input"
          value={selectedTeeId}
          onChange={(e) => setSelectedTeeId(e.target.value)}
        >
          <option value="">-- Select Tee --</option>
          {Object.entries(teesGrouped).map(([gender, tees]) => (
            <optgroup key={gender} label={gender}>
              {tees.map((t) => (
                <option key={t.id} value={t.id}>
                  {`${t.tee_name} ${t.total_yards} yds (${t.course_rating}/${t.slope_rating})`}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Rating & Slope */}
      <div className="card course-scorecard-meta">
        <span><strong>Rating:</strong> {selectedTee.course_rating}</span>
        <span><strong>Slope:</strong> {selectedTee.slope_rating}</span>
      </div>

      {/* Scorecard */}
      <div className="course-scorecard-wrapper card">
        {/* Left table: fixed width */}
        <table className="course-scorecard-left">
          <thead>
            <tr><th>Hole</th></tr>
            <tr><th>Par</th></tr>
            <tr><th>Yards</th></tr>
            {hasHandicap && <tr><th>Hcp</th></tr>}
          </thead>
        </table>

        {/* Right table: scrollable */}
        <div className="course-scorecard-scroll">
          <table className="course-scorecard-right">
            <thead>
              <tr>
                {holes.map((h) => <th key={h.id}>{h.hole_number}</th>)}
                <th>OUT</th>
                {selectedTee.number_of_holes === 18 && <th>IN</th>}
                <th>TOTAL</th>
              </tr>
              <tr>
                {holes.map((h) => <th key={h.id}>{h.par}</th>)}
                <th>{front9Totals.par}</th>
                {selectedTee.number_of_holes === 18 && <th>{back9Totals.par}</th>}
                <th>{fullTotals.par}</th>
              </tr>
              <tr>
                {holes.map((h) => <th key={h.id}>{h.yardage}</th>)}
                <th>{front9Totals.yards}</th>
                {selectedTee.number_of_holes === 18 && <th>{back9Totals.yards}</th>}
                <th>{fullTotals.yards}</th>
              </tr>
              {hasHandicap && (
                <tr>
                  {holes.map((h) => <th key={h.id}>{h.handicap ?? '-'}</th>)}
                  <th>-</th>
                  {selectedTee.number_of_holes === 18 && <th>-</th>}
                  <th>-</th>
                </tr>
              )}
            </thead>
          </table>
        </div>
      </div>
    </div>
  );
}