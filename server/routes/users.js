const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../config/db");
const auth = require("../middleware/auth");
const jwt = require("jsonwebtoken");

/**
 * Detects which unique key was violated
 */
const getDuplicateField = (err) => {
  if (!err?.code || err.code !== "ER_DUP_ENTRY" || !err.sqlMessage) return null;
  const msg = err.sqlMessage.toLowerCase();
  if (msg.includes("username")) return "username";
  if (msg.includes("email")) return "email";
  return null;
};

// --------------------------------------------------
// REGISTER
// --------------------------------------------------
router.post("/register", async (req, res) => {
  let { username, email, password } = req.body;

  if (!username || !email || !password)
    return res.status(400).json({ message: "Username, email, and password are required", type: "error" });

  username = username.trim();
  email = email.trim().toLowerCase();

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
      `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`,
      [username, email, hashedPassword],
      (err, result) => {
        if (err) {
          const field = getDuplicateField(err);
          if (field === "username") return res.status(400).json({ message: "Username is already in use", type: "error" });
          if (field === "email") return res.status(400).json({ message: "Email is already registered", type: "error" });

          return res.status(500).json({ message: "Failed to create user account", type: "error" });
        }

        const token = jwt.sign({ id: result.insertId }, process.env.JWT_SECRET, { expiresIn: "7d" });
        res.json({ user: { id: result.insertId, username, email }, token, type: "success" });
      }
    );
  } catch {
    res.status(500).json({ message: "Unexpected error while creating account", type: "error" });
  }
});

// --------------------------------------------------
// LOGIN
// --------------------------------------------------
router.post("/login", async (req, res) => {
  let { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Email and password are required", type: "error" });

  email = email.trim().toLowerCase();

  db.query(
    `SELECT id, username, email, password_hash FROM users WHERE email = ?`,
    [email],
    async (err, results) => {
      if (err) return res.status(500).json({ message: "Unable to process login request", type: "error" });
      if (!results.length) return res.status(400).json({ message: "Invalid email or password", type: "error" });

      const user = results[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(400).json({ message: "Invalid email or password", type: "error" });

      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
      res.json({ user: { id: user.id, username: user.username, email: user.email }, token, type: "success" });
    }
  );
});

// --------------------------------------------------
// GET CURRENT USER
// --------------------------------------------------
router.get("/me", auth, (req, res) => {
  db.query(
    `SELECT id, username, email, created_date FROM users WHERE id = ?`,
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Failed to retrieve user profile", type: "error" });
      if (!results.length) return res.status(404).json({ message: "User not found", type: "error" });
      res.json({ user: results[0], type: "success" });
    }
  );
});

// --------------------------------------------------
// UPDATE USER INFO
// --------------------------------------------------
router.put("/update", auth, (req, res) => {
  const { username, email } = req.body;

  if (!username?.trim() && !email?.trim())
    return res.status(400).json({ message: "At least one field must be provided", type: "error" });

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

  values.push(req.user.id);

  const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;

  db.query(sql, values, (err, result) => {
    if (err) {
      const field = getDuplicateField(err);
      if (field === "username") return res.status(400).json({ message: "Username is already in use", type: "error" });
      if (field === "email") return res.status(400).json({ message: "Email is already registered", type: "error" });

      return res.status(500).json({ message: "Failed to update user information", type: "error" });
    }

    if (!result.affectedRows)
      return res.status(404).json({ message: "User not found", type: "error" });

    res.json({ message: "User information updated successfully", type: "success" });
  });
});

// --------------------------------------------------
// CHANGE PASSWORD
// --------------------------------------------------
router.put("/change-password", auth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ message: "Current and new passwords are required", type: "error" });

  db.query("SELECT password_hash FROM users WHERE id = ?", [req.user.id], async (err, results) => {
    if (err) return res.status(500).json({ message: "Unable to verify current password", type: "error" });
    if (!results.length) return res.status(404).json({ message: "User not found", type: "error" });

    const valid = await bcrypt.compare(currentPassword, results[0].password_hash);
    if (!valid) return res.status(400).json({ message: "Current password is incorrect", type: "error" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.query("UPDATE users SET password_hash = ? WHERE id = ?", [hashedPassword, req.user.id], (err2) => {
      if (err2) return res.status(500).json({ message: "Failed to update password", type: "error" });
      res.json({ message: "Password updated successfully", type: "success" });
    });
  });
});

module.exports = router;