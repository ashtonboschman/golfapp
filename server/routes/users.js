const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
require("dotenv").config();

// Middleware to verify JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Expecting "Bearer <token>"
  if (!token) return res.status(401).json({ message: "No token provided" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
}

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`;
    db.query(sql, [username, email, hashedPassword], (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Email already exists or DB error" });
      }
      res.json({ message: "User registered successfully" });
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// LOGIN
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = `SELECT * FROM users WHERE email = ?`;
  db.query(sql, [email], async (err, users) => {
    if (err) return res.status(500).json({ message: "DB error" });
    if (users.length === 0) return res.status(400).json({ message: "User not found" });

    const user = users[0];
    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass)
      return res.status(400).json({ message: "Invalid credentials" });

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  });
});

// UPDATE USERNAME
router.put("/update", authenticateToken, (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ message: "Username required" });

  const sql = `UPDATE users SET username = ? WHERE id = ?`;
  db.query(sql, [username, req.user.id], (err) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json({ message: "Username updated successfully", username });
  });
});

// CHANGE PASSWORD
router.put("/change-password", authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword)
    return res.status(400).json({ message: "Both fields are required" });

  // Fetch user
  const sql = `SELECT * FROM users WHERE id = ?`;
  db.query(sql, [req.user.id], async (err, users) => {
    if (err) return res.status(500).json({ message: "DB error" });
    if (users.length === 0) return res.status(404).json({ message: "User not found" });

    const user = users[0];
    const validPass = await bcrypt.compare(currentPassword, user.password_hash);

    if (!validPass)
      return res.status(400).json({ message: "Current password is incorrect" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updateSql = `UPDATE users SET password_hash = ? WHERE id = ?`;

    db.query(updateSql, [hashedPassword, req.user.id], (updateErr) => {
      if (updateErr) return res.status(500).json({ message: "Error updating password" });
      res.json({ message: "Password updated successfully" });
    });
  });
});

module.exports = router;
