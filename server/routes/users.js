const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../config/db");

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`;
    db.query(sql, [username, email, hashedPassword], (err, result) => {
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

    res.json({
      message: "Login successful",
      user: { id: user.id, username: user.username, email: user.email }
    });
  });
});

module.exports = router;