const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../config/db");
const auth = require("../middleware/auth");
const jwt = require("jsonwebtoken");

// --------------------
// REGISTER
// POST /api/users/register
// --------------------
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    db.query("SELECT id FROM users WHERE email = ?", [email], async (err, results) => {
      if (err) return res.status(500).json({ message: "DB error", details: err.code });
      if (results.length > 0) return res.status(400).json({ message: "Email already registered" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");

      db.query(
        "INSERT INTO users (username, email, password_hash, created_date) VALUES (?, ?, ?, ?)",
        [username, email, hashedPassword, now],
        (err2, result) => {
          if (err2) return res.status(500).json({ message: "DB error", details: err2.code });
          res.json({ message: "User registered successfully!" });
        }
      );
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", details: err.message });
  }
});

// --------------------
// LOGIN
// POST /api/users/login
// --------------------
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password required" });

  db.query("SELECT id, username, email, password_hash FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) return res.status(500).json({ message: "DB error", details: err.code });
    if (results.length === 0) return res.status(400).json({ message: "Invalid credentials" });

    try {
      const user = results[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(400).json({ message: "Invalid credentials" });

      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
      res.json({ user: { id: user.id, username: user.username, email: user.email }, token });
    } catch (err2) {
      console.error(err2);
      res.status(500).json({ message: "Server error", details: err2.message });
    }
  });
});

// --------------------
// GET CURRENT USER
// GET /api/users/me
// --------------------
router.get("/me", auth, (req, res) => {
  const userId = req.user.id;
  const sql = "SELECT id, username, email, created_date, handicap FROM users WHERE id = ?";
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("DB error fetching user:", err);
      return res.status(500).json({ message: "Database error", details: err.code });
    }
    if (results.length === 0) return res.status(404).json({ message: "User not found" });
    res.json(results[0]);
  });
});

// --------------------
// UPDATE USER (username/email)
// PUT /api/users/update
// --------------------
router.put("/update", auth, (req, res) => {
  const userId = req.user.id;
  const { username, email } = req.body;

  if (!username?.trim() && !email?.trim()) {
    return res.status(400).json({ message: "At least one field (username or email) is required" });
  }

  const updates = [];
  const values = [];

  if (username?.trim()) {
    updates.push("username = ?");
    values.push(username.trim());
  }
  if (email?.trim()) {
    updates.push("email = ?");
    values.push(email.trim());
  }

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  updates.push("updated_date = ?");
  values.push(now);

  values.push(userId);

  const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;
  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("DB error updating user:", err);
      if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ message: "Email already exists" });
      return res.status(500).json({ message: "Database error", details: err.sqlMessage });
    }

    if (result.affectedRows === 0) return res.status(404).json({ message: "User not found" });

    const updatedFields = {};
    if (username?.trim()) updatedFields.username = username.trim();
    if (email?.trim()) updatedFields.email = email.trim();

    res.json({ message: "✅ User updated successfully!", updatedFields });
  });
});

// --------------------
// CHANGE PASSWORD
// PUT /api/users/change-password
// --------------------
router.put("/change-password", auth, (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current and new passwords are required" });
  }

  const selectSql = "SELECT password_hash FROM users WHERE id = ?";
  db.query(selectSql, [userId], async (err, results) => {
    if (err) {
      console.error("DB error fetching password:", err);
      return res.status(500).json({ message: "Database error", details: err.code });
    }
    if (results.length === 0) return res.status(404).json({ message: "User not found" });

    try {
      const validPassword = await bcrypt.compare(currentPassword, results[0].password_hash);
      if (!validPassword) return res.status(400).json({ message: "Current password is incorrect" });

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      const updateSql = "UPDATE users SET password_hash = ?, updated_date = ? WHERE id = ?";

      db.query(updateSql, [hashedPassword, now, userId], (err2) => {
        if (err2) {
          console.error("DB error updating password:", err2);
          return res.status(500).json({ message: "Database error", details: err2.code });
        }
        res.json({ message: "✅ Password updated successfully!" });
      });
    } catch (err) {
      console.error("Password hash error:", err);
      res.status(500).json({ message: "Server error", details: err.message });
    }
  });
});

module.exports = router;
