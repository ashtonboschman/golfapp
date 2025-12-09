const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../config/db");
const auth = require("../middleware/auth");
const jwt = require("jsonwebtoken");

// Helper for MySQL datetime format
const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");

// --------------------------------------------------
// REGISTER  (POST /api/users/register)
// --------------------------------------------------
router.post("/register", async (req, res) => {
  let { username, email, password, handicap } = req.body;

  if (!username || !email || !password)
    return res.status(400).json({ message: "All fields are required" });

  email = email.trim().toLowerCase();
  username = username.trim();

  try {
    db.query("SELECT id FROM users WHERE email = ?", [email], async (err, results) => {
      if (err) return res.status(500).json({ message: "Database error", details: err.code });

      if (results.length > 0)
        return res.status(400).json({ message: "Email already registered" });

      const hashedPassword = await bcrypt.hash(password, 10);

      db.query(
        "INSERT INTO users (username, email, password_hash, handicap, created_date) VALUES (?, ?, ?, ?, ?)",
        [username, email, hashedPassword, handicap || null, now()],
        (err2, result) => {
          if (err2) return res.status(500).json({ message: "Database error", details: err2.code });

          const token = jwt.sign({ id: result.insertId }, process.env.JWT_SECRET, { expiresIn: "7d" });
          res.json({ 
            user: { id: result.insertId, username, email, handicap: handicap || null }, 
            token 
          });
        }
      );
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", details: err.message });
  }
});

// --------------------------------------------------
// LOGIN (POST /api/users/login)
// --------------------------------------------------
router.post("/login", (req, res) => {
  let { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email and password required" });

  email = email.trim().toLowerCase();

  db.query(
    "SELECT id, username, email, password_hash, handicap FROM users WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) return res.status(500).json({ message: "Database error", details: err.code });

      if (results.length === 0)
        return res.status(400).json({ message: "Invalid credentials" });

      const user = results[0];
      const valid = await bcrypt.compare(password, user.password_hash);

      if (!valid)
        return res.status(400).json({ message: "Invalid credentials" });

      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });

      res.json({ 
        user: { id: user.id, username: user.username, email: user.email, handicap: user.handicap }, 
        token 
      });
    }
  );
});

// --------------------------------------------------
// GET CURRENT USER (GET /api/users/me)
// --------------------------------------------------
router.get("/me", auth, (req, res) => {
  db.query(
    "SELECT id, username, email, created_date, handicap FROM users WHERE id = ?",
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Database error", details: err.code });

      if (results.length === 0)
        return res.status(404).json({ message: "User not found" });

      res.json(results[0]);
    }
  );
});

// --------------------------------------------------
// UPDATE USER INFO (PUT /api/users/update)
// --------------------------------------------------
router.put("/update", auth, (req, res) => {
  let { username, email } = req.body;

  if (!username?.trim() && !email?.trim())
    return res.status(400).json({ message: "At least one field is required" });

  const updates = [];
  const values = [];

  if (username?.trim()) {
    updates.push("username = ?");
    values.push(username.trim());
  }
  if (email?.trim()) {
    updates.push("email = ?");
    values.push(email.trim().toLowerCase());
  }

  updates.push("updated_date = ?");
  values.push(now());
  values.push(req.user.id);

  const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;

  db.query(sql, values, (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY")
        return res.status(400).json({ message: "Email already exists" });
      return res.status(500).json({ message: "Database error", details: err.code });
    }

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "User not found" });

    res.json({ message: "User updated successfully!" });
  });
});

// --------------------------------------------------
// CHANGE PASSWORD (PUT /api/users/change-password)
// --------------------------------------------------
router.put("/change-password", auth, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword)
    return res.status(400).json({ message: "Current and new passwords required" });

  db.query("SELECT password_hash FROM users WHERE id = ?", [req.user.id], async (err, results) => {
    if (err) return res.status(500).json({ message: "Database error", details: err.code });

    if (results.length === 0)
      return res.status(404).json({ message: "User not found" });

    const valid = await bcrypt.compare(currentPassword, results[0].password_hash);
    if (!valid) return res.status(400).json({ message: "Current password is incorrect" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    db.query(
      "UPDATE users SET password_hash = ?, updated_date = ? WHERE id = ?",
      [hashedPassword, now(), req.user.id],
      (err2) => {
        if (err2)
          return res.status(500).json({ message: "Database error", details: err2.code });

        res.json({ message: "Password updated successfully!" });
      }
    );
  });
});

module.exports = router;