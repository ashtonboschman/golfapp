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
// GET ALL LOCATIONS
// ============================================================================
router.get("/", auth, async (req, res) => {
  try {
    const locations = await query(
      `SELECT l.*, c.club_name, c.course_name
       FROM locations l
       JOIN courses c ON l.course_id = c.id
       ORDER BY c.club_name ASC, c.course_name ASC, l.id ASC`
    );
    if (!locations.length) return res.json({ type: "success", message: "No locations found", results: [] });

    const response = [];
    for (const loc of locations) {
      const fullLoc = await buildLocationResponse(loc);
      response.push(fullLoc);
    }

    res.json({ type: "success", results: response });
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: "error", message: "Database error", details: err });
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
    if (!locations.length) return res.status(404).json({ type: "error", message: "Location not found" });

    const fullLocation = await buildLocationResponse(locations[0]);
    res.json({ type: "success", location: fullLocation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: "error", message: "Database error", details: err });
  }
});

// ============================================================================
// CREATE LOCATION
// ============================================================================
router.post("/", auth, async (req, res) => {
  try {
    const { course_id, address, city, state, country, latitude, longitude } = req.body;
    if (!course_id) return res.status(400).json({ type: "error", message: "course_id is required" });

    const courseCheck = await query(`SELECT id FROM courses WHERE id = ?`, [course_id]);
    if (!courseCheck.length) return res.status(400).json({ type: "error", message: "Course not found" });

    const result = await query(
      `INSERT INTO locations (course_id, address, city, state, country, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [course_id, address || null, city || null, state || null, country || null, latitude || null, longitude || null]
    );

    const newLocation = await query(`SELECT * FROM locations WHERE id = ?`, [result.insertId]);
    const fullLocation = await buildLocationResponse(newLocation[0]);

    res.status(201).json({ type: "success", message: "Location created", location: fullLocation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: "error", message: "Database error", details: err });
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

    if (!updates.length) return res.status(400).json({ type: "error", message: "No valid fields provided for update" });

    values.push(locationId);
    const sql = `UPDATE locations SET ${updates.join(", ")}, updated_date = NOW() WHERE id = ?`;
    const result = await query(sql, values);
    if (result.affectedRows === 0) return res.status(404).json({ type: "error", message: "Location not found" });

    const updatedLocation = await query(`SELECT * FROM locations WHERE id = ?`, [locationId]);
    const fullLocation = await buildLocationResponse(updatedLocation[0]);

    res.json({ type: "success", message: "Location updated", location: fullLocation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: "error", message: "Database error", details: err });
  }
});

// ============================================================================
// DELETE LOCATION
// ============================================================================
router.delete("/:id", auth, async (req, res) => {
  try {
    const locationId = req.params.id;
    const result = await query(`DELETE FROM locations WHERE id = ?`, [locationId]);
    if (result.affectedRows === 0) return res.status(404).json({ type: "error", message: "Location not found" });

    res.json({ type: "success", message: "Location deleted", locationId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ type: "error", message: "Database error", details: err });
  }
});

module.exports = router;