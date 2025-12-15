import { memo, useEffect, useState, useContext, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { AsyncPaginate } from 'react-select-async-paginate';
import HoleCard from "../components/HoleCard";

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
  // Fetchers
  // ────────────────────────────
  useEffect(() => {
    if (!token) return;

    const fetchCourses = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/courses?limit=1000`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setCourses(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchCourses();
  }, [token]);

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  const loadCourseOptions = async (search, loadedOptions, { page }) => {
    if (!token) return { options: [], hasMore: false, additional: { page: 1 } };

    try {
      const res = await fetch(
        `http://localhost:3000/api/courses?search=${encodeURIComponent(search)}&limit=20&page=${page}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();

      return {
        options: data.map((course) => ({ label: course.course_name, value: course.id })),
        hasMore: data.length === 20, // fetch more if page is full
        additional: { page: page + 1 },
      };
    } catch (err) {
      console.error(err);
      return { options: [], hasMore: false, additional: { page: 1 } };
    }
  };

  const loadTeeOptions = async (search, loadedOptions, { page }, courseId) => {
    if (!courseId) return { options: [], hasMore: false, additional: { page: 1 } };

    try {
      const res = await fetch(
        `http://localhost:3000/api/tees?course_id=${courseId}&search=${encodeURIComponent(search)}&limit=20&page=${page}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();

      const grouped = Object.entries(
        data.reduce((acc, tee) => {
          const genderKey = tee.gender.charAt(0).toUpperCase() + tee.gender.slice(1).toLowerCase();
          if (!acc[genderKey]) acc[genderKey] = [];
          acc[genderKey].push({
            label: `${tee.tee_name} ${tee.total_yards ?? 0} yds (${tee.course_rating ?? 0}/${tee.slope_rating ?? 0}) ${tee.number_of_holes ?? 0} holes`,
            value: tee.id,
          });
          return acc;
        }, {})
      ).map(([label, options]) => ({ label, options }));

      return { options: grouped, hasMore: false, additional: { page: page + 1 } };
    } catch (err) {
      console.error(err);
      return { options: [], hasMore: false, additional: { page: page + 1 } };
    }
  };

  const fetchTees = async (courseId) => {
    try {
      const res = await fetch(
        `http://localhost:3000/api/tees?course_id=${courseId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setTees(data);
      return data; // return for use in edit mode
    } catch (err) {
      console.error(err);
      setMessage("Error fetching tees.");
      return [];
    }
  };


  const fetchHoles = async (teeId, existingRoundHoles = [], isHoleByHole = 0) => {
    if (!teeId) return [];
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

      return data || [];
    } catch (err) {
      console.error(err);
      setMessage("Error fetching holes.");
      return [];
    }
  };

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedTee, setSelectedTee] = useState(null);

  useEffect(() => {
    if (round.course_id && !selectedCourse) {
      // Try to find it from loaded courses
      if (courses.length) {
        const found = courses.find(c => c.id === Number(round.course_id));
        if (found) setSelectedCourse({ label: found.course_name, value: found.id });
      }
    }
  }, [round.course_id, courses]);

  useEffect(() => {
    if (location.state && !initialized) {
      const { courseId, teeId } = location.state;
      if (courseId) setRound((prev) => ({ ...prev, course_id: String(courseId) }));
      if (teeId) setRound((prev) => ({ ...prev, tee_id: String(teeId) }));
    }
  }, [location.state, initialized]);

  useEffect(() => {
    if (token) loadCourseOptions();
  }, [token]);

  useEffect(() => {
    if (round.course_id) fetchTees(round.course_id);
  }, [round.course_id]);

  useEffect(() => {
  if (mode === "add" && !initialized && location.state) {
    const { courseId, teeId, courseName } = location.state;

    const initAddRound = async () => {
      if (courseId) {
        // Prefill course
        setRound(prev => ({ ...prev, course_id: String(courseId) }));
        setSelectedCourse({ label: courseName, value: courseId });

        // Fetch tees for this course
        const fetchedTees = await fetchTees(courseId);

        if (teeId) {
          // Prefill tee
          const foundTee = fetchedTees.find(t => t.id === Number(teeId));
          if (foundTee) {
            setRound(prev => ({ ...prev, tee_id: String(teeId) }));
            setSelectedTee({
              value: foundTee.id,
              label: `${foundTee.tee_name} ${foundTee.total_yards ?? 0} yds (${foundTee.course_rating ?? 0}/${foundTee.slope_rating ?? 0}) ${foundTee.number_of_holes ?? 0} holes`,
              teeObj: foundTee
            });

            // Fetch holes for tee and initialize scores
            const holesData = await fetchHoles(teeId, [], 0);

            // Calculate total par automatically
            const totalPar = holesData.reduce((sum, h) => sum + (h.par ?? 0), 0);
            setRound(prev => ({ ...prev, par_total: totalPar }));
          }
        }
      }
      setInitialized(true);
    };

    initAddRound();
  }
}, [mode, location.state, initialized]);


  useEffect(() => {
    if (mode !== "edit" || !id || !token || courses.length === 0) return;

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

        // Set selected course now that courses are loaded
        const foundCourse = courses.find(c => c.id === Number(roundData.course_id));
        if (foundCourse) {
          setSelectedCourse({ label: foundCourse.course_name, value: foundCourse.id });
        }

        // Fetch tees and holes as before...
        if (roundData.course_id) {
          const fetchedTees = await fetchTees(roundData.course_id);

          if (fetchedTees.length && roundData.tee_id) {
            const foundTee = fetchedTees.find(t => t.id === Number(roundData.tee_id));
            if (foundTee) {
              setSelectedTee({
                label: `${foundTee.tee_name} ${foundTee.total_yards ?? 0} yds (${foundTee.course_rating ?? 0}/${foundTee.slope_rating ?? 0}) ${foundTee.number_of_holes ?? 0} holes`,
                value: foundTee.id,
                teeObj: foundTee // store full tee object for later use if needed
              });

              // Fetch holes now that selectedTee is set
              if (roundData.tee_id) {
                await fetchHoles(roundData.tee_id, roundData.round_holes || [], roundData.hole_by_hole);
              }
            }
          }
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
  }, [id, mode, token, courses]);


  // ────────────────────────────
  // Fetch holes when tee changes
  // ────────────────────────────
  useEffect(() => {
    if (!round.tee_id) return;

    const initHoles = async () => {
      if (mode === "edit") {
        await fetchHoles(round.tee_id, round.round_holes || [], round.hole_by_hole);
      } else {
        // Add mode: initialize all holes with null
        await fetchHoles(round.tee_id, [], 0);
      }
    };

    initHoles();
  }, [round.tee_id, mode]);

  // ────────────────────────────
  // Handlers
  // ────────────────────────────
  const handleCourseChange = async (option) => {
    setSelectedCourse(option);

    // Reset tee selection
    setSelectedTee(null);
    setRound(prev => ({ ...prev, course_id: option?.value ?? "", tee_id: "" }));
    setHoles([]);
    setHoleScores([]);
    setTees([]); // clear previous tees

    if (option?.value) {
      const fetchedTees = await fetchTees(option.value);
      setTees(fetchedTees);
    }
  };
  
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
    setHoleScores((prev) => {
      const updated = [...prev];       // preserve array identity
      const hole = updated[index];     // preserve other elements

      updated[index] = {
        ...hole,
        [field]:
          (field === "fir_hit" || field === "gir_hit") && isHBH
            ? value
            : sanitizeNumeric(value) === ""
            ? null
            : Number(sanitizeNumeric(value)),
      };

      return updated;
    });
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

  const renderHoleCards = () => {
    if (!isHBH || !initialized) return null;

    const totals = calculateTotals();
    const show = (v) => (v === null ? "–" : v);

    return (
      <div>
        {holeScores.map((h, idx) => (
          <HoleCard
            key={h.hole_id}
            hole={h.hole_number}
            par={h.par}
            score={h.score}
            fir_hit={h.fir_hit}
            gir_hit={h.gir_hit}
            putts={h.putts}
            penalties={h.penalties}
            hasAdvanced={hasAdvanced}
            onChange={(holeNumber, field, value) =>
              handleHoleScoreChange(idx, field, value)
            }
          />
        ))}

        {holeScores.length > 0 && (
          <div className="card hole-card-total">
            <div className="hole-header">Totals</div>
            <div className="hole-card-grid">
              <div className="hole-field"><strong>Par:</strong> {show(totals.par)}</div>
              <div className="hole-field"><strong>Score:</strong> {show(totals.score)}</div>
              {hasAdvanced && (
                <>
                  <div className="hole-field"><strong>FIR:</strong> {show(totals.fir_hit)}</div>
                  <div className="hole-field"><strong>Putts:</strong> {show(totals.putts)}</div>
                  <div className="hole-field"><strong>GIR:</strong> {show(totals.gir_hit)}</div>
                  <div className="hole-field"><strong>Penalties:</strong> {show(totals.penalties)}</div>
                </>
              )}
            </div>
          </div>
          
        )}
      </div>
    );
  };

  const groupedTeeOptions = useMemo(() => {
    return Object.entries(
      tees.reduce((acc, tee) => {
        const genderKey = tee.gender.charAt(0).toUpperCase() + tee.gender.slice(1).toLowerCase();
        if (!acc[genderKey]) acc[genderKey] = [];
        acc[genderKey].push({
          label: `${tee.tee_name} ${tee.total_yards ?? 0} yds (${tee.course_rating ?? 0}/${tee.slope_rating ?? 0}) ${tee.number_of_holes ?? 0} holes`,
          value: tee.id,
        });
        return acc;
      }, {})
    ).map(([label, options]) => ({ label, options }));
  }, [tees]);

  // ────────────────────────────
  // Render
  // ────────────────────────────
  return (
    <div className="page-stack">
      {message && (
        <p className={`message ${message.startsWith("❌") ? "error" : "success"}`}>
          {message}
        </p>
      )}

      <form onSubmit={handleSubmit} className="form">
        <div className="form-row">
          <label className="form-label">Date</label>
          <input type="date" name="date" value={round.date} onChange={handleChange} className="form-input" required />
        </div>

        <div className="form-row">
          <label className="form-label">Course</label>
          <AsyncPaginate
            value={selectedCourse}
            loadOptions={loadCourseOptions}
            onChange={option => {
              setSelectedCourse(option);
              setSelectedTee(null);
              setRound(prev => ({ ...prev, course_id: option?.value ?? "", tee_id: "" }));
              setHoles([]);
              setHoleScores([]);
            }}
            additional={{ page: 1 }}
            placeholder="Select Course"
            isClearable
          />
        </div>

        <div className="form-row">
          <label className="form-label">Tee</label>
          <AsyncPaginate
            key={selectedCourse?.value || "no-course"}  // force remount
            value={selectedTee}
            loadOptions={(search, loadedOptions, additional) =>
              loadTeeOptions(search, loadedOptions, additional, selectedCourse?.value)
            }
            isGrouped
            onChange={async (option) => {
              setSelectedTee(option);
              const teeId = option?.value ?? "";
              setRound(prev => ({ ...prev, tee_id: teeId }));

              if (teeId) {
                const holesData = await fetchHoles(teeId);
                const totalPar = holesData.reduce((sum, h) => sum + (h.par ?? 0), 0);
                setRound(prev => ({ ...prev, par_total: totalPar }));
              }

            }}
            isDisabled={!selectedCourse}
            placeholder="Select Tee"
            isClearable
            additional={{ page: 1 }}
          />
        </div>

        {initialized && (
          <>
            <button type="button" className="btn btn-toggle" onClick={toggleHoleByHole}>
              {isHBH ? "Switch to Quick Score Mode" : "Switch to Hole-by-Hole Mode"}
            </button>

            <button
              type="button"
              className="btn btn-toggle"
              onClick={() =>
                setRound((prev) => ({ ...prev, advanced_stats: hasAdvanced ? 0 : 1 }))
              }
            >
              {hasAdvanced ? "Remove Advanced Stats" : "Add Advanced Stats"}
            </button>
          </>
        )}

        {!isHBH && (
          <div className="form-row">
            <label className="form-label">Par</label>
            <input type="text" value={round.par_total ?? ""} className="form-input" disabled />
          </div>
        )}

        {!isHBH && (
          <div className="form-row">
            <label className="form-label">Score</label>
            <input
              type="text"
              pattern="[0-9]*"
              name="score"
              value={formatValue(round.score)}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
        )}

        {!isHBH && hasAdvanced && (
          <>
            {["fir_hit", "gir_hit", "putts", "penalties"].map((field) => {
              const labelMap = {
                fir_hit: "FIR",
                gir_hit: "GIR",
                putts: "Putts",
                penalties: "Penalties",
              };

              return (
                <div key={field} className="form-row">
                  <label className="form-label">{labelMap[field]}</label>
                  <input
                    type="text"
                    pattern="[0-9]*"
                    name={field}
                    value={formatValue(round[field])}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
              );
            })}
          </>
        )}

        {renderHoleCards()}

        <div className="form-row">
          <label className="form-label">Notes</label>
          <textarea name="notes" value={round.notes} onChange={handleChange} rows={3} className="form-input" />
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => navigate(origin)} className="btn btn-cancel">Cancel</button>
          <button type="submit" disabled={loading} className="btn btn-save">
            {loading ? (mode === "add" ? "Adding..." : "Updating...") : mode === "add" ? "Add Round" : "Update Round"}
          </button>
        </div>
      </form>
    </div>
  );
}