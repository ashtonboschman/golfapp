const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/auth");

// Helper to promisify queries
const query = (sql, params) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, results) => (err ? reject(err) : resolve(results)))
  );

// -----------------------------------------------------------------------------
// Helper: Build full course object with location, tees, and holes
// -----------------------------------------------------------------------------
const buildCourseResponse = async (courseId) => {
  const course = (await query(`SELECT * FROM courses WHERE id = ?`, [courseId]))[0];
  if (!course) return null;

  const locationRow = (await query(`SELECT * FROM locations WHERE course_id = ?`, [courseId]))[0] || {};
  const teesRaw = await query(`SELECT * FROM tees WHERE course_id = ? ORDER BY id ASC`, [courseId]);
  const teeIds = teesRaw.map(t => t.id);
  const holes = teeIds.length
    ? await query(`SELECT * FROM holes WHERE tee_id IN (?) ORDER BY tee_id ASC, hole_number ASC`, [teeIds])
    : [];

  const tees = { male: [], female: [] };
  teesRaw.forEach(t => {
    const teeWithHoles = { ...t, holes: holes.filter(h => h.tee_id === t.id) };
    if (t.gender === "male") tees.male.push(teeWithHoles);
    else if (t.gender === "female") tees.female.push(teeWithHoles);
  });

  return {
    ...course,
    location: {
      state: locationRow.state || "Unknown",
      country: locationRow.country || "Unknown",
      address: locationRow.address || null,
      city: locationRow.city || null,
      latitude: locationRow.latitude || null,
      longitude: locationRow.longitude || null
    },
    tees
  };
};

// ============================================================================
// GET ALL COURSES (Paginated, returns plain array)
// Example: /courses?limit=20&page=1
// ============================================================================
router.get("/", auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search}%` : null;

    let sql = `SELECT * FROM courses`;
    const params = [];

    if (search) {
      sql += ` WHERE course_name LIKE ?`;
      params.push(search);
    }

    sql += ` ORDER BY course_name ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const courses = await query(sql, params);

    if (!courses.length) return res.json([]);

    const courseResponses = [];
    for (const c of courses) {
      const fullCourse = await buildCourseResponse(c.id);
      if (fullCourse) courseResponses.push(fullCourse);
    }

    res.json(courseResponses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error", details: err });
  }
});

// ============================================================================
// GET SINGLE COURSE BY ID
// ============================================================================
router.get("/:id", auth, async (req, res) => {
  try {
    const courseId = req.params.id;
    const course = await buildCourseResponse(courseId);
    if (!course) return res.status(404).json({ error: "Course not found" });

    res.json(course);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error", details: err });
  }
});

// ============================================================================
// CREATE COURSE
// ============================================================================
router.post("/", auth, async (req, res) => {
  try {
    const { id: courseIdFromApi, club_name, course_name, location, tees } = req.body;
    if (!courseIdFromApi || !club_name || !course_name)
      return res.status(400).json({ error: "id, club_name, and course_name are required" });

    await query(
      `INSERT INTO courses (id, club_name, course_name) VALUES (?, ?, ?)`,
      [courseIdFromApi, club_name, course_name]
    );

    if (location) {
      const { address, city, state, country, latitude, longitude } = location;
      await query(
        `INSERT INTO locations (course_id, address, city, state, country, latitude, longitude)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [courseIdFromApi, address || null, city || null, state || null, country || null, latitude || null, longitude || null]
      );
    }

    if (tees) {
      for (const gender of ["male", "female"]) {
        if (!tees[gender]) continue;
        for (const tee of tees[gender]) {
          const {
            id: teeIdFromApi,
            tee_name, course_rating, slope_rating, bogey_rating, total_yards, total_meters,
            number_of_holes, par_total, front_course_rating, front_slope_rating, front_bogey_rating,
            back_course_rating, back_slope_rating, back_bogey_rating, holes: teeHoles
          } = tee;

          const teeResult = await query(
            `INSERT INTO tees
             (id, course_id, gender, tee_name, course_rating, slope_rating, bogey_rating,
              total_yards, total_meters, number_of_holes, par_total,
              front_course_rating, front_slope_rating, front_bogey_rating,
              back_course_rating, back_slope_rating, back_bogey_rating)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              teeIdFromApi || null,
              courseIdFromApi, gender, tee_name, course_rating, slope_rating, bogey_rating,
              total_yards, total_meters, number_of_holes, par_total,
              front_course_rating, front_slope_rating, front_bogey_rating,
              back_course_rating, back_slope_rating, back_bogey_rating
            ]
          );

          const teeId = teeIdFromApi || teeResult.insertId;

          if (teeHoles && teeHoles.length) {
            for (let i = 0; i < teeHoles.length; i++) {
              const { par, yardage } = teeHoles[i];
              await query(
                `INSERT INTO holes (tee_id, hole_number, par, yardage) VALUES (?, ?, ?, ?)`,
                [teeId, i + 1, par, yardage]
              );
            }
          }
        }
      }
    }

    const newCourse = await buildCourseResponse(courseIdFromApi);
    res.json(newCourse);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error", details: err });
  }
});

// ============================================================================
// UPDATE COURSE
// ============================================================================
router.put("/:id", auth, async (req, res) => {
  try {
    const courseId = req.params.id;
    const allowed = ["club_name", "course_name"];
    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(req.body)) {
      if (allowed.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (!updates.length) return res.status(400).json({ error: "No valid fields provided for update" });

    values.push(courseId);
    const result = await query(`UPDATE courses SET ${updates.join(", ")} WHERE id = ?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Course not found" });

    const updatedCourse = await buildCourseResponse(courseId);
    res.json(updatedCourse);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error", details: err });
  }
});

// ============================================================================
// DELETE COURSE
// ============================================================================
router.delete("/:id", auth, async (req, res) => {
  try {
    const courseId = req.params.id;

    const tees = await query(`SELECT id FROM tees WHERE course_id = ?`, [courseId]);
    const teeIds = tees.map(t => t.id);

    if (teeIds.length) await query(`DELETE FROM holes WHERE tee_id IN (?)`, [teeIds]);
    if (teeIds.length) await query(`DELETE FROM tees WHERE id IN (?)`, [teeIds]);
    await query(`DELETE FROM locations WHERE course_id = ?`, [courseId]);
    const result = await query(`DELETE FROM courses WHERE id = ?`, [courseId]);

    if (result.affectedRows === 0) return res.status(404).json({ error: "Course not found" });
    res.json({ message: "Course deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error", details: err });
  }
});

module.exports = router;