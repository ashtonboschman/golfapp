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
          if (field === "username")
            return res.status(400).json({ message: "Username is already in use", type: "error" });
          if (field === "email")
            return res.status(400).json({ message: "Email is already registered", type: "error" });

          return res.status(500).json({ message: "Failed to create user account", type: "error" });
        }

        const userId = result.insertId;

        db.query(
          `INSERT INTO user_profiles (user_id) VALUES (?)`,
          [userId],
          (profileErr) => {
            if (profileErr) {
              return res.status(500).json({ message: "Failed to initialize user profile", type: "error" });
            }

            const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

            res.json({
              user: { id: userId, username, email },
              token,
              type: "success"
            });
          }
        );
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
    `SELECT
      u.id,
      u.username,
      u.email,
      u.created_date,

      p.first_name,
      p.last_name,
      p.avatar_url,
      p.bio,
      p.gender,
      p.default_tee,
      p.favorite_course_id,
      p.dashboard_visibility
    FROM users u
    JOIN user_profiles p ON p.user_id = u.id
    WHERE u.id = ?`,
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Failed to retrieve user profile", type: "error" });
      if (!results.length) return res.status(404).json({ message: "User not found", type: "error" });
      res.json({ user: results[0], type: "success" });
    }
  );
});

// --------------------------------------------------
// GET USER DETAILS (PUBLIC)
// --------------------------------------------------
router.get("/details/:id", (req, res) => {
  const requestedUserId = req.params.id;

  db.query(
    `SELECT
       u.id,
       u.username,
       p.first_name,
       p.last_name,
       p.avatar_url,
       p.bio,
       p.gender,
       p.default_tee,
       p.favorite_course_id
     FROM users u
     JOIN user_profiles p ON p.user_id = u.id
     WHERE u.id = ?`,
    [requestedUserId],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Failed to retrieve user details", type: "error" });
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
// UPDATE USER PROFILE
// --------------------------------------------------
router.put("/profile", auth, (req, res) => {
  const {
    first_name,
    last_name,
    avatar_url,
    bio,
    gender,
    default_tee,
    favorite_course_id,
    dashboard_visibility
  } = req.body;

  const allowedGenders = ["male", "female", "unspecified"];
  const allowedTees = ["blue", "white", "red", "gold", "black"];
  const allowedVisibility = ["private", "friends", "public"];

  if (gender && !allowedGenders.includes(gender)) {
    return res.status(400).json({ message: "Invalid gender value", type: "error" });
  }

  if (default_tee && !allowedTees.includes(default_tee)) {
    return res.status(400).json({ message: "Invalid default tee value", type: "error" });
  }

  if (dashboard_visibility && !allowedVisibility.includes(dashboard_visibility)) {
    return res.status(400).json({ message: "Invalid dashboard visibility value", type: "error" });
  }

  const updates = [];
  const values = [];

  const fields = {
    first_name,
    last_name,
    avatar_url,
    bio,
    gender,
    default_tee,
    favorite_course_id,
    dashboard_visibility
  };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (!updates.length) {
    return res.status(400).json({ message: "No profile fields provided", type: "error" });
  }

  values.push(req.user.id);

  const sql = `
    UPDATE user_profiles
    SET ${updates.join(", ")}
    WHERE user_id = ?
  `;

  db.query(sql, values, (err) => {
    if (err) {
      return res.status(500).json({ message: "Failed to update profile", type: "error" });
    }

    res.json({ message: "Profile updated successfully", type: "success" });
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