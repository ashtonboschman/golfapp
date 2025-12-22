const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/auth");

// Helper for MySQL datetime format
const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");

// Helper to enforce canonical order
const orderIds = (id1, id2) => (id1 < id2 ? [id1, id2] : [id2, id1]);

// --------------------------------------------------
// SEARCH USERS WITH FRIEND STATUS
// GET /api/friends/search?q=
// --------------------------------------------------
router.get("/search", auth, (req, res) => {
  const userId = req.user.id;
  const query = (req.query.q || "").trim();

  if (!query) return res.status(400).json({ type: "error", message: "Query required" });

  const likeQuery = `%${query}%`;

  const sql = `
    SELECT 
      u.id,
      u.username,
      up.first_name,
      up.last_name,
      up.avatar_url,
      fr_sent.id AS outgoing_request_id,
      fr_recv.id AS incoming_request_id,
      CASE
        WHEN f.user_id IS NOT NULL THEN 'friend'
        WHEN fr_sent.id IS NOT NULL THEN 'outgoing'
        WHEN fr_recv.id IS NOT NULL THEN 'incoming'
        ELSE 'none'
      END AS status
    FROM users u
    LEFT JOIN user_profiles up ON up.user_id = u.id
    LEFT JOIN friends f
      ON f.user_id = LEAST(?, u.id) AND f.friend_id = GREATEST(?, u.id)
    LEFT JOIN friend_requests fr_sent
      ON fr_sent.requester_id = ? AND fr_sent.recipient_id = u.id
    LEFT JOIN friend_requests fr_recv
      ON fr_recv.recipient_id = ? AND fr_recv.requester_id = u.id
    WHERE u.id != ? AND (u.username LIKE ? OR up.first_name LIKE ? OR up.last_name LIKE ?)
    ORDER BY u.username
    LIMIT 50
  `;

  db.query(sql, [userId, userId, userId, userId, userId, likeQuery, likeQuery, likeQuery], (err, results) => {
    if (err) return res.status(500).json({ type: "error", message: "Database error", details: err.code });
    res.json({ type: "success", results });
  });
});

// --------------------------------------------------
// GET FRIENDS LIST
// GET /api/friends
// --------------------------------------------------
router.get("/", auth, (req, res) => {
  const userId = req.user.id;
  const sql = `
    SELECT u.id, u.username, up.first_name, up.last_name, up.avatar_url
    FROM friends f
    JOIN users u 
      ON (u.id = f.user_id OR u.id = f.friend_id)
    JOIN user_profiles up ON up.user_id = u.id
    WHERE ? IN (f.user_id, f.friend_id) AND u.id != ?
    ORDER BY u.username
  `;
  db.query(sql, [userId, userId], (err, results) => {
    if (err) return res.status(500).json({ type: "error", message: "Database error", details: err.code });
    res.json({ type: "success", results });
  });
});

// --------------------------------------------------
// INCOMING FRIEND REQUESTS
// GET /api/friends/incoming
// --------------------------------------------------
router.get("/incoming", auth, (req, res) => {
  const userId = req.user.id;
  const sql = `
    SELECT fr.id, fr.created_date, u.id AS user_id, u.username, up.first_name, up.last_name, up.avatar_url
    FROM friend_requests fr
    JOIN users u ON u.id = fr.requester_id
    JOIN user_profiles up ON up.user_id = u.id
    WHERE fr.recipient_id = ?
    ORDER BY fr.created_date DESC
  `;
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ type: "error", message: "Database error", details: err.code });
    res.json({ type: "success", results });
  });
});

// --------------------------------------------------
// OUTGOING FRIEND REQUESTS
// GET /api/friends/outgoing
// --------------------------------------------------
router.get("/outgoing", auth, (req, res) => {
  const userId = req.user.id;
  const sql = `
    SELECT fr.id, fr.created_date, u.id AS user_id, u.username, up.first_name, up.last_name, up.avatar_url
    FROM friend_requests fr
    JOIN users u ON u.id = fr.recipient_id
    JOIN user_profiles up ON up.user_id = u.id
    WHERE fr.requester_id = ?
    ORDER BY fr.created_date DESC
  `;
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ type: "error", message: "Database error", details: err.code });
    res.json({ type: "success", results });
  });
});

// --------------------------------------------------
// SEND FRIEND REQUEST
// POST /api/friends
// --------------------------------------------------
router.post("/", auth, (req, res) => {
  const requesterId = req.user.id;
  const { recipientId } = req.body;

  if (!recipientId || requesterId === recipientId) {
    return res.status(400).json({ type: "error", message: "Invalid recipient" });
  }

  db.query(
    "SELECT 1 FROM friends WHERE (user_id = LEAST(?, ?) AND friend_id = GREATEST(?, ?))",
    [requesterId, recipientId, requesterId, recipientId],
    (err, results) => {
      if (err) return res.status(500).json({ type: "error", message: "Database error", details: err.code });
      if (results.length > 0) return res.status(409).json({ type: "error", message: "Already friends" });

      db.query(
        "SELECT 1 FROM friend_requests WHERE requester_id = ? AND recipient_id = ?",
        [requesterId, recipientId],
        (err2, results2) => {
          if (err2) return res.status(500).json({ type: "error", message: "Database error", details: err2.code });
          if (results2.length > 0) return res.status(409).json({ type: "error", message: "Friend request already exists" });

          db.query(
            "INSERT INTO friend_requests (requester_id, recipient_id, created_date) VALUES (?, ?, ?)",
            [requesterId, recipientId, now()],
            (err3, insertResult) => {
              if (err3) {
                return res.status(500).json({ type: "error", message: "Database error", details: err3.code });
              }

              const requestId = insertResult.insertId;

              db.query(
                `
                SELECT 
                  fr.id,
                  fr.created_date,
                  u.id AS user_id,
                  u.username,
                  up.first_name,
                  up.last_name,
                  up.avatar_url
                FROM friend_requests fr
                JOIN users u ON u.id = fr.recipient_id
                JOIN user_profiles up ON up.user_id = u.id
                WHERE fr.id = ?
                `,
                [requestId],
                (err4, rows) => {
                  if (err4) {
                    return res.status(500).json({ type: "error", message: "Database error", details: err4.code });
                  }

                  res.status(201).json({
                    type: "success",
                    message: "Friend request sent",
                    request: rows[0]
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

// --------------------------------------------------
// ACCEPT FRIEND REQUEST
// POST /api/friends/:id/accept
// --------------------------------------------------
router.post("/:id/accept", auth, (req, res) => {
  const requestId = req.params.id;
  const userId = req.user.id;

  db.query(
    "SELECT requester_id FROM friend_requests WHERE id = ? AND recipient_id = ?",
    [requestId, userId],
    (err, results) => {
      if (err) return res.status(500).json({ type: "error", message: "Database error", details: err.code });
      if (results.length === 0) return res.status(404).json({ type: "error", message: "Friend request not found" });

      const requesterId = results[0].requester_id;
      const [id1, id2] = orderIds(userId, requesterId);
      db.query(
        "INSERT INTO friends (user_id, friend_id, created_date) VALUES (?, ?, ?)",
        [id1, id2, now()],
        (err2) => {
          if (err2) return res.status(500).json({ type: "error", message: "Database error", details: err2.code });
          db.query("DELETE FROM friend_requests WHERE id = ?", [requestId], (err3) => {
            if (err3) return res.status(500).json({ type: "error", message: "Database error", details: err3.code });
            db.query(
              `SELECT u.id, u.username, up.first_name, up.last_name, up.avatar_url
               FROM users u
               JOIN user_profiles up ON u.id = up.user_id
               WHERE u.id = ?`,
              [requesterId],
              (err4, rows) => {
                if (err4) return res.status(500).json({ type: "error", message: "Database error", details: err4.code });

                const friend = rows[0];
                res.json({
                  type: "success",
                  message: "Friend request accepted",
                  friend
                });
              }
            );
          });
        }
      );
    }
  );
});

// --------------------------------------------------
// DECLINE FRIEND REQUEST
// POST /api/friends/:id/decline
// --------------------------------------------------
router.post("/:id/decline", auth, (req, res) => {
  db.query(
    "DELETE FROM friend_requests WHERE id = ? AND recipient_id = ?",
    [req.params.id, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ type: "error", message: "Database error", details: err.code });
      if (result.affectedRows === 0) return res.status(404).json({ type: "error", message: "Friend request not found" });
      res.json({ type: "success", message: "Friend request declined" });
    }
  );
});

// --------------------------------------------------
// CANCEL OUTGOING FRIEND REQUEST
// POST /api/friends/:id/cancel
// --------------------------------------------------
router.post("/:id/cancel", auth, (req, res) => {
  db.query(
    "DELETE FROM friend_requests WHERE id = ? AND requester_id = ?",
    [req.params.id, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ type: "error", message: "Database error", details: err.code });
      if (result.affectedRows === 0) return res.status(404).json({ type: "error", message: "Friend request not found" });
      res.json({ type: "success", message: "Outgoing friend request cancelled" });
    }
  );
});

// --------------------------------------------------
// REMOVE FRIEND
// DELETE /api/friends/:id
// --------------------------------------------------
router.delete("/:id", auth, (req, res) => {
  const friendId = req.params.id;
  const userId = req.user.id;
  const [id1, id2] = orderIds(userId, friendId);

  db.query(
    "DELETE FROM friends WHERE user_id = ? AND friend_id = ?",
    [id1, id2],
    (err, result) => {
      if (err) return res.status(500).json({ type: "error", message: "Database error", details: err.code });
      if (result.affectedRows === 0) return res.status(404).json({ type: "error", message: "Friend not found" });
      res.json({ type: "success", message: "Friend removed" });
    }
  );
});

module.exports = router;