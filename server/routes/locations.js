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
// Helper: Build full location object with tees + holes for its course
// -----------------------------------------------------------------------------
const buildLocationResponse = async (location) => {
  const teesRaw = await query(`SELECT * FROM tees WHERE course_id = ? ORDER BY id ASC`, [location.course_id]);
  const teeIds = teesRaw.map(t => t.id);
  const holes = teeIds.length
    ? await query(`SELECT * FROM holes WHERE tee_id IN (?) ORDER BY tee_id ASC, hole_number ASC`, [teeIds])
    : [];

  const tees = teesRaw.map(t => ({ ...t, holes: holes.filter(h => h.tee_id === t.id) }));
  return { ...location, tees };
};

// ============================================================================
// GET ALL LOCATIONS (with full course structure)
// ============================================================================
router.get("/", auth, async (req, res) => {
  try {
    const locations = await query(
      `SELECT l.*, c.club_name, c.course_name
       FROM locations l
       JOIN courses c ON l.course_id = c.id
       ORDER BY c.club_name ASC, c.course_name ASC, l.id ASC`
    );
    if (!locations.length) return res.json([]);

    const response = [];
    for (const loc of locations) {
      const fullLoc = await buildLocationResponse(loc);
      response.push(fullLoc);
    }

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error", details: err });
  }
});

// ============================================================================
// GET SINGLE LOCATION BY ID
// ============================================================================
router.get("/:id", auth, async (req, res) => {
  try {
    const locationId = req.params.id;
    const locations = await query(
      `SELECT l.*, c.club_name, c.course_name
       FROM locations l
       JOIN courses c ON l.course_id = c.id
       WHERE l.id = ?`,
      [locationId]
    );
    if (!locations.length) return res.status(404).json({ error: "Location not found" });

    const fullLocation = await buildLocationResponse(locations[0]);
    res.json(fullLocation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error", details: err });
  }
});

// ============================================================================
// CREATE LOCATION
// ============================================================================
router.post("/", auth, async (req, res) => {
  try {
    const { course_id, address, city, state, country, latitude, longitude } = req.body;
    if (!course_id) return res.status(400).json({ error: "course_id is required" });

    const courseCheck = await query(`SELECT id FROM courses WHERE id = ?`, [course_id]);
    if (!courseCheck.length) return res.status(400).json({ error: "Course not found" });

    const result = await query(
      `INSERT INTO locations (course_id, address, city, state, country, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [course_id, address || null, city || null, state || null, country || null, latitude || null, longitude || null]
    );

    const newLocation = await query(`SELECT * FROM locations WHERE id = ?`, [result.insertId]);
    res.json(await buildLocationResponse(newLocation[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error", details: err });
  }
});

// ============================================================================
// UPDATE LOCATION
// ============================================================================
router.put("/:id", auth, async (req, res) => {
  try {
    const locationId = req.params.id;
    const allowed = ["course_id", "address", "city", "state", "country", "latitude", "longitude"];
    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(req.body)) {
      if (allowed.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (!updates.length) return res.status(400).json({ error: "No valid fields provided for update" });

    values.push(locationId);
    const sql = `UPDATE locations SET ${updates.join(", ")}, updated_date = NOW() WHERE id = ?`;
    const result = await query(sql, values);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Location not found" });

    const updatedLocation = await query(`SELECT * FROM locations WHERE id = ?`, [locationId]);
    res.json(await buildLocationResponse(updatedLocation[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error", details: err });
  }
});

// ============================================================================
// DELETE LOCATION
// ============================================================================
router.delete("/:id", auth, async (req, res) => {
  try {
    const locationId = req.params.id;
    const result = await query(`DELETE FROM locations WHERE id = ?`, [locationId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Location not found" });

    res.json({ message: "Location deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error", details: err });
  }
});

module.exports = router;